/**
 * A module that exports an AmqpStreamClient client
 * which inherits from the Amqp base client
 * @module AmqpStreamClient
 */

// Import some helpers modules
import _ from 'lodash';
import Promise from 'bluebird';
import md5 from 'js-md5';

// Import AmqpClient module from which AmqpStreamClient inherits
import AmqpClient from './amqpClient';

const { CONFIG } = require('../../config/constants');

class AmqpStreamClient extends AmqpClient {
  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  constructor(opts = {}) {
    super(opts);
    const amqpStreamOptions = CONFIG.amqp.stream;
    this._defaultStreamRoutingKey = amqpStreamOptions.defaultStreamRoutingKey;
    this._streamQueueArguments = amqpStreamOptions.streamQueueArguments;
    this._subscriptions = [];
  }

  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */
  streamFrom(streamHooks = [], opts = {}) {
    if (streamHooks.length > 0) {
      return Promise.mapSeries(streamHooks, (streamHook) => {
        return this._attachStreamHook(streamHook, opts);
      });
    } else {
      return Promise.reject(new Error('Missing stream hooks'));
    }
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * Start consuming messages from a device's channel
   * It generates an auto delete queue from which consume
   * and binds it to the channel exchange
   *
   * @private
   * @param {Object} streamHook - Object containit hook info
   * { stream: {String}, callback: {func}}
   * or
   * { deviceId: {String}, channel: {String}, callback: {func}}
   * @param {Object} opts - connection options
   * @return a promise containing current connection
   */
  _attachStreamHook(streamHook, opts = {}) {
    // Receive messages from imput queue
    return new Promise((resolve, reject) => {
      const {
        stream = undefined, deviceId = undefined, channel = undefined,
        topic = undefined, routingKey = undefined
      } = streamHook;
      const cache = (typeof (streamHook.cache) !== 'boolean') ? true : streamHook.cache;
      if (stream === undefined && (channel === undefined || deviceId === undefined)) {
        reject(new Error('Missing Stream or Device ID and Channel'));
      }
      const emptyFunction = function () { return undefined; };
      const callback = streamHook.callback || emptyFunction;

      const currentTime = new Date().getTime();
      let tempQueue;
      this._createChannel(`${currentTime}`).then((ch) => {
        this._amqpChannels[`${currentTime}`] = ch;
        let promisesChain;
        // if current hook is a stream
        // checks the existence of the stream queue and starts consuming
        let localOpts = _.cloneDeep(opts);
        localOpts = _.merge(_.cloneDeep(this._subscribeArgs), localOpts);
        if (stream) {
          if (!this.liveStreamExists(stream)) {
            console.error(`Stream ${stream} does not exist`); // eslint-disable-line no-console
            resolve(false);
          }
          if (cache) {
            // Cached streams are connected to the existing live stream queue
            tempQueue = this._cachedStreamQueue(stream);
            promisesChain = this._amqpChannels[`${currentTime}`]
              .checkQueue(tempQueue, this._streamQueueArguments).then(() => {
                return this._amqpChannels[`${currentTime}`].consume(tempQueue, (message) => {
                  // Call message callback
                  callback(this._parseContent(message.content), message.fields, message.properties);
                }, localOpts);
              });
          } else {
            // Uncached streams are connected to the stream exchange and create a temp queue
            const streamExchange = this.exchangeName(stream, this._liveStreamSuffix);
            tempQueue = this.tempQueue(stream, this._liveStreamSuffix, currentTime);
            promisesChain = this._amqpChannels[`${currentTime}`].checkExchange(streamExchange).then(() => {
              return this._amqpChannels[`${currentTime}`].assertQueue(tempQueue, this._streamQueueArguments);
            }).then(() => {
              return this._amqpChannels[`${currentTime}`].bindQueue(tempQueue, streamExchange, routingKey);
            }).then(() => {
              return this._amqpChannels[`${currentTime}`].consume(tempQueue, (message) => {
                callback(this._parseContent(message.content), message.fields, message.properties);
              }, localOpts);
            });
          }
        } else {
          // else if current hook is channel (or a couple deviceId, channel)
          // creates a temp queue, binds to channel exchange and starts consuming
          const channelExchangeName = this.exchangeName(deviceId, channel);
          tempQueue = this.tempQueue(deviceId, channel, currentTime);
          promisesChain = this._amqpChannels[`${currentTime}`].checkExchange(channelExchangeName).then(() => {
            return this._amqpChannels[`${currentTime}`].assertQueue(tempQueue, this._streamQueueArguments);
          }).then(() => {
            return this._amqpChannels[`${currentTime}`].bindQueue(tempQueue, channelExchangeName,
              this._streamRoutingKeyFor({
                deviceId, channel, routingKey, topic
              }));
          }).then(() => {
            return this._amqpChannels[`${currentTime}`].consume(tempQueue, (message) => {
              callback(this._parseContent(message.content), message.fields, message.properties);
            }, localOpts);
          });
        }
        return promisesChain;
      }).then(() => {
        const subscriptionId = md5(tempQueue);
        this._subscriptions[subscriptionId] = { amqpChannel: currentTime };
        resolve(_.merge(streamHook, { id: subscriptionId }));
      }).catch((reason) => {
        reject(reason);
      });
    });
  }

  /**
   * Unsubscribe client from a topic
   *
   * @param {String} subscriptionId - subscription ID
   * @return a promise containing the result of the operation
   */
  unsubscribe(subscriptionId = undefined) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Invalid connection'));
      } else {
        const subscription = this._subscriptions[subscriptionId];
        if (subscription) {
          const { amqpChannel } = subscription;
          if (this._amqpChannels[amqpChannel]) {
            this._amqpChannels[amqpChannel].close();
            delete this._amqpChannels[amqpChannel];
            delete this._subscriptions[subscriptionId];
          }
          resolve(true);
        } else {
          reject(new Error('Subscription not found'));
        }
      }
    });
  }

  /**
   * Generate the exchange name for a device's channel
   *
   * @private
   * @param {String} streamName - stream name from which you want to stream
   * @return a string that represents the stream queue
   */
  _cachedStreamQueue(streamName) {
    return `${streamName}.${this._liveStreamSuffix}`;
  }

  /**
   * Generate the exchange name for a device's channel
   *
   * @private
   * @param {Object} params - params
   * @return a string that represents the rounting key
   */
  _streamRoutingKeyFor(params = {}) {
    const {
      deviceId = undefined, channel = undefined, routingKey = undefined, topic = undefined
    } = params;
    if (_.isEmpty(routingKey) && _.isEmpty(deviceId)) {
      // if both routingKey and deviceId are empty return default routingKey
      return this._defaultStreamRoutingKey;
    } else if (routingKey) {
      // return routing key if present
      return routingKey;
    } else {
      let streamRoutingKey = deviceId;
      if (channel) { streamRoutingKey += `.${channel}`; }
      if (topic) { streamRoutingKey += `.${topic}`; }
      return `${streamRoutingKey}`;
    }
  }
}

// Remove unwanted methods inherited from AmqpClient
delete AmqpStreamClient.onReceive;
delete AmqpStreamClient.publish;
delete AmqpStreamClient._routingKeyFor;

export default AmqpStreamClient;
