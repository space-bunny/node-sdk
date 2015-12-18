/**
 * A module that exports an AmqpStreamClient client
 * which inherits from the Amqp base client
 * @module AmqpStreamClient
 */

// Import some helpers modules
import merge from 'merge';
import Promise from 'bluebird';

// Import AmqpClient module from which AmqpStreamClient inherits
import AmqpClient from './amqp_client';
import SpaceBunnyErrors from '../spacebunny_errors';

class AmqpStreamClient extends AmqpClient {

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  constructor(opts) {
    super(opts);
    this._defaultStreamRoutingKey = '#';
    this._streamQueueArguments = { exclusive: true, autoDelete: true, durable: false };
    this._streamQueueSuffix = 'stream';
  }


  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */
  streamFrom(streamHooks, opts) {
    const promises = streamHooks.map((streamHook) => {
      return this._attachStreamHook(streamHook, opts);
    });

    return Promise.any(promises);
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * Start consuming messages from a device's channel
   * It generates an auto delete queue from which consume
   * and binds it to the channel exchange
   *
   * @private
   * @param {Object} streamHook - Object containit hook info
   * { deviceId: {String}, channel: {String}, callback: {func}}
   * @param {Object} opts - connection options
   * @return a promise containing current connection
   */
  _attachStreamHook(streamHook, opts) {
    // Receive messages from imput queue
    const deviceId = streamHook.deviceId;
    const channel = streamHook.channel;
    const routingKey = streamHook.routingKey || this._defaultStreamRoutingKey;
    const emptyFunction = function() { return undefined; };
    const callback = streamHook.callback || emptyFunction;
    if (deviceId === undefined || channel === undefined) {
      throw new SpaceBunnyErrors.MissingStreamConfigurations('Missing Device ID or Channel');
    }
    return new Promise((resolve, reject) => {
      const currentTime = new Date().getTime();
      this._createChannel(`${currentTime}`).then((ch) => {
        this._amqpChannels[`${currentTime}`] = ch;
        return this._amqpChannels[`${currentTime}`].checkExchange(this._channelExchange(deviceId, channel));
      }).then(() => {
        return this._amqpChannels[`${currentTime}`].assertQueue(this._streamQueue(deviceId, channel, currentTime), this._streamQueueArguments);
      }).then(() => {
        return this._amqpChannels[`${currentTime}`].bindQueue(this._streamQueue(deviceId, channel, currentTime), this._channelExchange(deviceId, channel), routingKey);
      }).then(() => {
        return this._amqpChannels[`${currentTime}`].consume(this._streamQueue(deviceId, channel, currentTime), (message) => {
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
   * Generate the exchange name for a device's channel
   *
   * @private
   * @param {String} deviceId - Device id from which you want to stream
   * @param {String} channel - channel name from which you want to stream
   * @param {String} currentTime - current UNIX timestamp
   * @return a string that represents the stream queue name prefixed with current timestamp, client ID and channel exchange
   */
  _streamQueue(deviceId, channel, currentTime) {
    const prefix = currentTime || new Date().getTime();
    return `${prefix}-${this._connectionParams.client}-${this._channelExchange(deviceId, channel)}.${this._streamQueueSuffix}`;
  }

}

// Remove unwanted methods inherited from AmqpClient
delete AmqpStreamClient.onReceive;
delete AmqpStreamClient.publish;
delete AmqpStreamClient._routingKeyFor;

export default AmqpStreamClient;
