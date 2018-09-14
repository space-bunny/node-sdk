/**
 * A module that exports an AmqpClient client
 * which inherits from the SpaceBunny base client
 * @module AmqpClient
 */

// Import some helpers modules
import Promise from 'bluebird';
import _ from 'lodash';

// Import amqplib
import amqp from 'amqplib';

// Import SpaceBunny main module from which AmqpClient inherits
import SpaceBunny from '../spacebunny';
import AmqpMessage from '../messages/amqpMessage';

const { CONFIG } = require('../../config/constants');

class AmqpClient extends SpaceBunny {
  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts = {}) {
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
    this._connectionOpts = amqpOptions.connectionOpts;
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is received
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  onReceive(callback, opts = {}) {
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
            const amqpMessage = new AmqpMessage(message, this._deviceId, localOpts);
            const ackNeeded = this._autoAck(localOpts.ack);
            // Check if should be accepted or not
            if (amqpMessage.blackListed()) {
              if (ackNeeded) { ch.nack(message, localOpts.allUpTo, localOpts.requeue); }
              return;
            }
            // Call message callback
            callback(this._parseContent(amqpMessage.content), amqpMessage.fields, amqpMessage.properties);
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
  publish(channel, message, opts = {}) {
    return new Promise((resolve, reject) => {
      let localOpts = _.cloneDeep(opts);
      localOpts = _.merge(_.cloneDeep(this._publishArgs), localOpts);
      this._createChannel('output', localOpts).then((ch) => {
        const { routingKey = undefined, topic = undefined } = localOpts;
        const promises = [
          ch.checkExchange(this.deviceId()),
          ch.publish(this.deviceId(), this._routingKeyFor({ channel, routingKey, topic }),
            Buffer.from(this._encapsulateContent(message)), localOpts)
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
  disconnect() {
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
  connect(opts = {}) {
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
          return amqp.connect(connectionString, connectionOpts).then((conn) => {
            conn.on('error', (err) => {
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

  isConnected() {
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
  _createChannel(channelName, opts = {}) {
    channelName = `${channelName}${(opts.withConfirm === true) ? 'WithConfirm' : ''}`;
    return new Promise((resolve, reject) => {
      if (this._amqpChannels[channelName]) {
        resolve(this._amqpChannels[channelName]);
      } else {
        this.connect().then((conn) => {
          if (opts.withConfirm === true) {
            return conn.createConfirmChannel();
          } else {
            return conn.createChannel();
          }
        }).then((ch) => {
          this._amqpChannels[channelName] = ch;
          this._amqpChannels[channelName].on('error', (err) => {
            console.error(err);
            this._amqpChannels[channelName] = undefined;
          });
          this._amqpChannels[channelName].on('close', (err) => {
            console.error(err);
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
  _closeChannel(channelName, opts = {}) {
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
  _routingKeyFor(params) {
    const { channel = undefined, routingKey = undefined, topic = undefined } = params;
    if (routingKey) {
      return routingKey;
    } else {
      let messageRoutingKey = this.deviceId();
      if (!_.isEmpty(channel)) {
        messageRoutingKey += `.${channel}`;
      }
      if (!_.isEmpty(topic)) {
        messageRoutingKey += `.${topic}`;
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
  _autoAck(ack) {
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
