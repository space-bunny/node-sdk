/**
 * A module that exports an AmqpClient client
 * which inherits from the SpaceBunny base client
 * @module AmqpClient
 */

// Import some helpers modules
import Promise from 'bluebird';
import _ from 'lodash';

// Import amqplib
import * as amqp from 'amqplib';

// Import SpaceBunny main module from which AmqpClient inherits
import SpaceBunny from '../spacebunny';
import AmqpMessage from '../messages/amqpMessage';
import { encapsulateContent } from '../utils';
import CONFIG from '../../config/constants';

class AmqpClient extends SpaceBunny {

  _amqpConnection: any;
  _amqpChannels: any;
  _protocol: string;
  _tlsProtocol: string;
  _inputQueueArgs: any;
  _deviceExchangeArgs: any;
  _subscribeArgs: any;
  _publishArgs: any;
  _connectionOpts: any;

  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts: any = {}) {
    super(opts);
    this._amqpConnection = undefined;
    this._amqpChannels = {};
    const amqpOptions = CONFIG.amqp;
    this._protocol = amqpOptions.protocol;
    this._tlsProtocol = amqpOptions.tls.protocol;
    this._inputQueueArgs = amqpOptions.inputQueueArgs;
    this._deviceExchangeArgs = amqpOptions.deviceExchangeArgs;
    this._subscribeArgs = amqpOptions.subscribeArgs;
    this._publishArgs = amqpOptions.publishArgs;
    this._connectionOpts = amqpOptions.connection.opts;
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is received
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  onReceive = (callback: Function, opts: any = {}): Promise<any> => {
    // Receive messages from imput queue
    return new Promise((resolve, reject) => {
      let localOpts = _.cloneDeep(opts);
      localOpts = _.merge(_.cloneDeep(this._subscribeArgs), localOpts);
      localOpts.noAck = (localOpts.ack === null);
      this._createChannel('input', localOpts).then((ch) => {
        return Promise.all([
          ch.checkQueue(`${this.deviceId()}.${this._inboxTopic}`, this._inputQueueArgs),
          ch.consume(`${this.deviceId()}.${this._inboxTopic}`, (message) => {
            // Create message object
            const amqpMessage = new AmqpMessage({
              message,
              receiverId: this._deviceId,
              subscriptionOpts: localOpts,
              channel: ch
            });
            const ackNeeded = this._autoAck(localOpts.ack);
            // Check if should be accepted or not
            if (amqpMessage.blackListed()) {
              if (ackNeeded) { ch.nack(message, localOpts.allUpTo, localOpts.requeue); }
              return;
            }
            // Call message callback
            callback(amqpMessage);
            // Check if ACK is needed
            if (ackNeeded) { ch.ack(message, localOpts.allUpTo); }
          }, localOpts)
        ]);
      }).then((res) => {
        resolve(res);
      }).catch((reason) => {
        reject(reason);
      });
    });
  }

  /**
   * Publish a message on a specific channel
   *
   * @param {String} channel - channel name on which you want to publish a message
   * @param {Object} message - the message payload
   * @param {Object} opts - publication options
   * @return promise containing the result of the subscription
   */
  publish = (channel: string, message: any, opts: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      let localOpts = _.cloneDeep(opts);
      localOpts = _.merge(_.cloneDeep(this._publishArgs), localOpts);
      this._createChannel('output', localOpts).then((ch) => {
        const { routingKey = undefined, topic = undefined } = localOpts;
        const promises = [
          ch.checkExchange(this.deviceId()),
          ch.publish(this.deviceId(), this._routingKeyFor({ channel, routingKey, topic }),
            Buffer.from(encapsulateContent(message)), localOpts)
        ];
        if (localOpts.withConfirm === true) {
          promises.push(ch.waitForConfirms());
        }
        return Promise.all(promises);
      }).then((res) => {
        resolve(res);
      }).catch((reason) => {
        reject(reason);
      });
    });
  }

  /**
   * Destroy the connection between the amqp client and broker
   *
   * @return a promise containing the result of the operation
   */
  disconnect = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (this._amqpConnection === undefined) {
        reject(new Error('Not Connected'));
      } else {
        this._amqpConnection.close().then(() => {
          this._amqpConnection = undefined;
          this._amqpChannels = {};
          this.emit('disconnect');
          resolve(true);
        }).catch((reason) => {
          reject(reason);
        });
      }
    });
  }

  /**
   * Establish an amqp connection with the broker
   * using configurations retrieved from the endpoint.
   * If the connnection already exists, returns the current connnection
   *
   * @return a promise containing current connection
   */
  connect = (opts: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      let connectionOpts = _.cloneDeep(opts);
      connectionOpts = _.merge(_.cloneDeep(this._connectionOpts), connectionOpts);
      this.getEndpointConfigs().then((endpointConfigs) => {
        const connectionParams = endpointConfigs.connection;
        if (this.isConnected()) {
          resolve(this._amqpConnection);
          return undefined;
        } else {
          let connectionString = '';
          if (this._tls) {
            connectionString = `${this._tlsProtocol}://${connectionParams.deviceId || connectionParams.client}:`
              + `${connectionParams.secret}@${connectionParams.host}:`
              + `${connectionParams.protocols.amqp.tlsPort}/${connectionParams.vhost.replace('/', '%2f')}`;
            connectionOpts = _.merge(connectionOpts, this._tlsOpts);
          } else {
            connectionString = `${this._protocol}://${connectionParams.deviceId || connectionParams.client}:`
              + `${connectionParams.secret}@${connectionParams.host}:`
              + `${connectionParams.protocols.amqp.port}/${connectionParams.vhost.replace('/', '%2f')}`;
          }
          return amqp.connect(connectionString, connectionOpts).then((conn: any) => {
            conn.on('error', (err) => {
              this._amqpConnection = undefined;
              this.emit('error', err);
              reject(err);
            });
            conn.on('close', (err) => {
              this.emit('close', err);
              this._amqpConnection = undefined;
            });
            conn.on('blocked', (reason) => {
              this.emit('blocked', reason);
              console.warn(reason); // eslint-disable-line no-console
            });
            conn.on('unblocked', (reason) => {
              this.emit('unblocked', reason);
              console.warn(reason); // eslint-disable-line no-console
            });
            this._amqpConnection = conn;
            this.on('error', () => {});
            this.emit('connect');
            resolve(this._amqpConnection);
          }).catch((reason) => {
            reject(reason);
          });
        }
      }).catch((reason) => {
        reject(reason);
      });
    });
  }

  isConnected = (): boolean => {
    return (this._amqpConnection !== undefined);
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * Creates a channel on current connection
   *
   * @private
   * @param {String} channelName - indicates the channel name
   * @param {Object} opts - channel options
   * @return a promise containing the current channel
   */
  _createChannel = (channel: string, opts: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      const { routingKey = undefined, topic = undefined, withConfirm = true } = opts;
      const suffix = topic || routingKey || '';
      const channelName = `${channel}${suffix}${(withConfirm === true) ? 'WithConfirm' : ''}`;
      if (this._amqpChannels[channelName]) {
        if (typeof this._amqpChannels[channelName] === 'boolean') {
          this.on('channelOpen', (ch) => {
            if (ch === channelName) {
              resolve(this._amqpChannels[channelName]);
            }
          });
        } else {
          resolve(this._amqpChannels[channelName]);
        }
      } else {
        this._amqpChannels[channelName] = true;
        this.connect().then((conn) => {
          if (opts.withConfirm === true) {
            return conn.createConfirmChannel();
          } else {
            return conn.createChannel();
          }
        }).then((ch) => {
          this._amqpChannels[channelName] = ch;
          this.emit('channelOpen', channelName);
          this._amqpChannels[channelName].on('error', (err) => {
            if (err) {
              console.error(err); // eslint-disable-line no-console
            }
            // TODO close channel in function of error type??
            this._amqpChannels[channelName] = undefined;
          });
          this._amqpChannels[channelName].on('close', (err) => {
            if (err) {
              console.error(err); // eslint-disable-line no-console
            }
            this._amqpChannels[channelName] = undefined;
          });
          resolve(ch);
        }).catch((reason) => {
          reject(reason);
        });
      }
    });
  }

  /**
   * Close a channel on current connection
   *
   * @private
   * @param {String} channelName - indicates if the channel is input or output
   * @return a promise containing the result of the operation
   */
  _closeChannel = (channelName: string, opts: any = {}): Promise<any> => {
    channelName = `${channelName}${(opts.withConfirm === true) ? 'WithConfirm' : ''}`;
    return new Promise((resolve, reject) => {
      const ch = this._amqpChannels[channelName];
      if (ch === undefined) {
        reject(new Error('Invalid Channel Object'));
      } else {
        ch.close().then(() => {
          this._amqpChannels[channelName] = undefined;
          resolve(true);
        }).catch((reason) => {
          reject(reason);
        });
      }
    });
  }

  /**
   * Generate the routing key for a specific channel
   *
   * @private
   * @param {Object} params - params
   * @return a string that represents the routing key for that channel
   */
  _routingKeyFor = (params: any): string => {
    const { channel = undefined, routingKey = undefined, topic = undefined } = params;
    if (routingKey) {
      return routingKey;
    } else {
      let messageRoutingKey = this.deviceId();
      if (!_.isEmpty(channel)) {
        messageRoutingKey += `.${channel || ''}`;
      }
      if (!_.isEmpty(topic)) {
        messageRoutingKey += `.${topic || ''}`;
      }
      return messageRoutingKey;
    }
  }

  /**
   * Check if the SDK have to automatically ack messages
   *
   * @private
   * @param {String} ack - the ack type, it should be 'manual' or 'auto'
   * @return boolean - true if messages have to be autoacked, false otherwise
   */
  _autoAck = (ack: string): boolean => {
    if (ack) {
      if (!_.includes(CONFIG[this._protocol].ackTypes, ack)) {
        console.error('Wrong acknowledge type'); // eslint-disable-line no-console
      }
      switch (ack) {
        case 'auto':
          return true;
        default:
          return false;
      }
    }
    return true;
  }
}

export default AmqpClient;
