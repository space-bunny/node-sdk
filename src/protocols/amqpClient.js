/**
 * A module that exports an AmqpClient client
 * which inherits from the SpaceBunny base client
 * @module AmqpClient
 */

// Import some helpers modules
import merge from 'merge';
import Promise from 'bluebird';
import when from 'when';
import _ from 'lodash';

// Import amqplib
import amqp from 'amqplib';

// Import SpaceBunny main module from which AmqpClient inherits
import SpaceBunny from '../spacebunny';
import Message from '../message';
const CONFIG = require('../../config/constants').CONFIG;

class AmqpClient extends SpaceBunny {

  /**
   * @constructor
   * @param {Object} opts - options must contain api-key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts) {
    super(opts);
    this._protocol = 'amqp';
    this._protocolPrefix = 'amqp://';
    this._sslProtocolPrefix = 'amqps://';
    this._amqpConnection = undefined;
    this._amqpChannels = {};
    this._inputQueueArgs = { };
    this._deviceExchangeArgs = { };
    this._subscribeArgs = { noAck: true, requeue: false, allUpTo: false };
    this._publishArgs = { withConfirm: false };
    this._socketOptions = {
      frameMax: 32768, // 32 KB
      heartbeat: 60 // 60 seconds
    };
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is received
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  onReceive(callback, opts) {
    opts = merge(this._subscribeArgs, opts);
    opts.noAck = (opts.ack === null);
    // Receive messages from imput queue
    return new Promise((resolve, reject) => {
      this._createChannel('input', opts).then((ch) => {
        return when.all([
          ch.checkQueue(`${this.deviceId()}.${this._inputTopic}`, this._inputQueueArgs),
          ch.consume(`${this.deviceId()}.${this._inputTopic}`, (res) => {
            // Create message object
            const message = new Message(res, this._deviceId, opts);
            // Chec if should be accepted or not
            if (message.blackListed()) {
              ch.nack(res, opts.allUpTo, opts.requeue);
              return;
            }
            // Call message callback
            callback(this._parseContent(res.content), res.fields, res.properties);
            // Check if ACK is needed
            if (this._autoAck(opts.ack)) { ch.ack(res, opts.allUpTo); }
          }, opts)
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
    opts = merge(this._publishArgs, opts);
    return new Promise((resolve, reject) => {
      this._createChannel('output', opts).then((ch) => {
        const bufferedMessage = new Buffer(this._encapsulateContent(message));
        const promises = [
          ch.checkExchange(this.deviceId()),
          ch.publish(this.deviceId(), this._routingKeyFor(channel), bufferedMessage, opts)
        ];
        if (opts.withConfirm === true) {
          promises.push(ch.waitForConfirms());
        }
        return when.all(promises);
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
        reject('Not Connected');
      } else {
        this._amqpConnection.close().then(() => {
          this._amqpConnection = undefined;
          resolve(true);
        }).catch((reason) => {
          reject(reason);
        });
      }
    });
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * Establish an amqp connection with the broker
   * using configurations retrieved from the endpoint.
   * If the connnection already exists, returns the current connnection
   *
   * @private
   * @return a promise containing current connection
   */
  _connect() {
    let connectionOpts = merge({}, this._socketOptions);

    return new Promise((resolve, reject) => {
      this.getConnectionParams().then((connectionParams) => {
        if (this._amqpConnection !== undefined) {
          resolve(this._amqpConnection);
        } else {
          // TODO if ssl change connections string and connection parameters
          let connectionString = '';
          if (this._ssl) {
            if (this._checkSslOptions()) {
              connectionString = `${this._sslProtocolPrefix}${connectionParams.deviceId || connectionParams.client}:` +
                `${connectionParams.secret}@${connectionParams.host}:` +
                `${connectionParams.protocols.amqp.sslPort}/${connectionParams.vhost.replace('/', '%2f')}`;
              connectionOpts = merge(connectionOpts, this._sslOpts);
            } else {
              reject('Missing required SSL connection parameters');
            }
          } else {
            connectionString = `${this._protocolPrefix}${connectionParams.deviceId || connectionParams.client}:` +
              `${connectionParams.secret}@${connectionParams.host}:` +
              `${connectionParams.protocols.amqp.port}/${connectionParams.vhost.replace('/', '%2f')}`;
          }
          amqp.connect(connectionString, connectionOpts).then((conn) => {
            conn.on('error', (err) => {
              reject(err);
            });
            conn.on('blocked', (reason) => {
              console.warn(reason); // eslint-disable-line no-console
            });
            conn.on('unblocked', (reason) => {
              console.warn(reason); // eslint-disable-line no-console
            });
            this._amqpConnection = conn;
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
        this._connect().then((conn) => {
          if (opts.withConfirm === true) {
            return conn.createConfirmChannel();
          } else {
            return conn.createChannel();
          }
        }).then((ch) => {
          this._amqpChannels[channelName] = ch;
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
        reject('Invalid Channel Object');
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
   * @param {String} channel - channel name on which you want to publish a message
   * @return a string that represents the routing key for that channel
   */
  _routingKeyFor(channel) {
    return `${this.deviceId()}.${channel}`;
  }

  /**
   * Automatically parse message content
   *
   * @private
   * @param {Object/String} message - the received message
   * @return an object containing the input message with parsed content
   */
  _parseContent(message) {
    let parsedMessage = message;
    if (Buffer.isBuffer(parsedMessage)) {
      const content = parsedMessage.toString('utf-8');
      try {
        parsedMessage = JSON.parse(content);
      } catch (ex) {
        parsedMessage = content;
      }
    }
    return parsedMessage;
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
      if (!_.includes(CONFIG.ackTypes, ack)) {
        console.error('Wrong acknowledge type'); // eslint-disable-line no-console
      }
      switch (ack) {
        case 'auto':
          return true;
        default:
          return false;
      }
    }
    return false;
  }

}

export default AmqpClient;
