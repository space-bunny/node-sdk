/**
 * A module that exports an AmqpClient client
 * which inherits from the SpaceBunny base client
 * @module AmqpClient
 */

// Import some helpers modules
import merge from 'merge';
import Promise from 'bluebird';
// Import amqplib
import amqp from 'amqplib';
import when from 'when';

// Import SpaceBunny main module from which AmqpClient inherits
import SpaceBunny from '../spacebunny';
import SpaceBunnyErrors from '../spacebunny_errors';

class AmqpClient extends SpaceBunny {

  /**
   * @constructor
   * @param {Object} opts - constructor options may contain api-key or connection options
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
    this._subscribeArgs = { noAck: true };
    this._publishArgs = {};
    this.getConnectionParams();
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is receviced
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  onReceive(callback, opts) {
    // Receive messages from imput queue
    return new Promise((resolve, reject) => {
      this._createChannel('input').then((channel) => {
        this._amqpChannels.input = channel;
        return this._amqpChannels.input.checkQueue(`${this.deviceId()}.${this._inputTopic}`, this._inputQueueArgs);
      }).then(() => {
        return this._amqpChannels.input.consume(`${this.deviceId()}.${this._inputTopic}`, (message) => {
          callback(this._parseContent(message));
        }, merge(this._subscribeArgs, opts) );
      }).then(function() {
        resolve(true);
      }).catch(function(reason) {
        reject(reason);
      });
    });
  }

  /**
   * Publish a message on a specific channel
   *
   * @param {String} channel - channel name on which you want to publish a message
   * @param {Object} message - the message payload
   * @param {Object} message - the message payload
   * @return promise containing true if the
   */
  publish(channel, message, opts = {}) {
    opts = merge(this._publishArgs, opts);
    return new Promise((resolve, reject) => {
      this._createChannel().then((ch) => {
        this._amqpChannels.output = ch;
        const bufferedMessage = new Buffer(this._encapsulateContent(message));
        return when.all([
          this._amqpChannels.output.checkExchange(this.deviceId()),
          this._amqpChannels.output.publish(this.deviceId(), this._routingKeyFor(channel), bufferedMessage, opts)
        ]);
      }).then(function(res) {
        resolve(res);
      }).catch(function(reason) {
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
        this._amqpConnection.close().then(function() {
          this._amqpConnection = undefined;
          resolve(true);
        }).catch(function(reason) {
          reject(reason);
        });
      }
    });
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * @private
   * Establish an amqp connection with the broker
   * using configurations retrieved from the endpoint
   *
   * @param {Object} opts - connection options
   * @return a promise containing current connection
   */
  _connect(opts) {
    opts = merge({}, opts);

    return new Promise((resolve, reject) => {
      if (this._amqpConnection !== undefined) {
        resolve(this._amqpConnection);
      } else {
        const connectionParams = this._connectionParams;
        // TODO if ssl change connections string and connection parameters
        let connectionString = '';
        if (this._ssl) {
          if (this._checkSslOptions()) {
            // TODO Certificate host and IP ??
            connectionParams.host = 'FojaMac';
            connectionString = `${this._sslProtocolPrefix}${connectionParams.deviceId || connectionParams.client}:${connectionParams.secret}@${connectionParams.host}:${connectionParams.protocols.amqp.sslPort}/${connectionParams.vhost.replace('/', '%2f')}`;
            opts = merge(opts, this._sslOpts);
          } else {
            throw new SpaceBunnyErrors.ApiKeyOrConfigurationsRequired('Missing required SSL connection parameters');
          }
        } else {
          connectionString = `${this._protocolPrefix}${connectionParams.deviceId || connectionParams.client}:${connectionParams.secret}@${connectionParams.host}:${connectionParams.protocols.amqp.port}/${connectionParams.vhost.replace('/', '%2f')}`;
        }
        amqp.connect(connectionString, opts).then((conn) => {
          process.once('SIGINT', function() { conn.close(); });
          conn.on('error', function(err) {
            reject(err);
          });
          conn.on('blocked', function(reason) {
            console.warn(reason); // eslint-disable-line no-console
          });
          conn.on('unblocked', function(reason) {
            console.warn(reason); // eslint-disable-line no-console
          });
          this._amqpConnection = conn;
          resolve(this._amqpConnection);
        }).catch(function(reason) {
          reject(reason);
        });
      }
    });
  }

  /**
   * @private
   * Create a channel on current connection, if connection does not
   * exists creates a new one. If channel already exists return
   * instance of that channel
   *
   * @param {String} channelType - indicates if the channel is input or output
   * @return a promise containing the current channel
   */
  _createChannel() {
    return new Promise((resolve, reject) => {
      this._connect().then(function(conn) {
        return conn.createChannel();
      }).then((ch) => {
        resolve(ch);
      }).catch(function(reason) {
        reject(reason);
      });
    });
  }

  /**
   * @private
   * Close a channel on current connection, if connection does not
   * exists creates a new one.
   *
   * @param {String} channelType - indicates if the channel is input or output
   * @return a promise containing the result of the operation
   */
  _closeChannel(channelType) {
    return new Promise((resolve, reject) => {
      const ch = this._amqpChannels[channelType];
      if (ch === undefined) {
        reject('Invalid Channel Object');
      } else {
        ch.close().then(function() {
          resolve(true);
        }).catch(function(reason) {
          reject(reason);
        });
      }
    });
  }

  /**
   * @private
   * Generate the routing key for a specific channel
   *
   * @param {String} channel - channel name on which you want to publish a message
   * @return a string that represents the routing key for that channel
   */
  _routingKeyFor(channel) {
    return `${this.deviceId()}.${channel}`;
  }

  /**
   * @private
   * Automatically parse message content
   *
   * @param {Object} message - the received message
   * @return an object containing the input message with parsed content
   */
  _parseContent(message) {
    const parsedMessage = message;
    if (Buffer.isBuffer(parsedMessage.content)) {
      const content = parsedMessage.content.toString('utf-8');
      try {
        parsedMessage.content = JSON.parse(content);
      } catch (ex) {
        parsedMessage.content = content;
      }
    }
    return parsedMessage;
  }
}

export default AmqpClient;
