/**
 * A module that exports an AmqpStreamClient client
 * which inherits from the Amqp base client
 * @module AmqpStreamClient
 */

// Import some helpers modules
import merge from 'merge';
import Promise from 'bluebird';

// Import AmqpClient module from which AmqpStreamClient inherits
import AmqpClient from './amqpClient';
import SpaceBunnyErrors from '../spacebunnyErrors';

class AmqpStreamClient extends AmqpClient {

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  constructor(opts) {
    super(opts);
    this._defaultStreamRoutingKey = '#';
    this._streamQueueArguments = { exclusive: true, autoDelete: true, durable: false };
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
    const stream = streamHook.stream;
    if (stream === undefined && (channel === undefined || deviceId === undefined)) {
      throw new SpaceBunnyErrors.MissingStreamConfigurations('Missing Stream or Device ID and Channel');
    }
    const routingKey = streamHook.routingKey || this._defaultStreamRoutingKey;
    const emptyFunction = function() { return undefined; };
    const callback = streamHook.callback || emptyFunction;

    return new Promise((resolve, reject) => {
      const currentTime = new Date().getTime();
      this._createChannel(`${currentTime}`).then((ch) => {
        this._amqpChannels[`${currentTime}`] = ch;
        let promisesChain = undefined;
        // if current hook is a stream
        // checks the existence of the stream queue and starts consuming
        if (stream) {
          const streamQueue = this._streamQueue(stream);
          console.log(`streaming from ${streamQueue}`); // eslint-disable-line no-console
          promisesChain = this._amqpChannels[`${currentTime}`].checkQueue(streamQueue, this._streamQueueArguments).then(() =>{
            return this._amqpChannels[`${currentTime}`].consume(streamQueue, (message) => {
              callback(this._parseContent(message));
            }, merge(this._subscribeArgs, opts) );
          });
        } else {
          // else if current hook is channel (or a couple deviceId, channel)
          // creates a temp queue, binds to channel exchange and starts consuming
          const channelExchangeName = this._channelExchange(deviceId, channel);
          const streamChannelQueue = this._streamChannelQueue(deviceId, channel, currentTime);
          console.log(`streaming from ${streamChannelQueue}`); // eslint-disable-line no-console
          promisesChain = this._amqpChannels[`${currentTime}`].checkExchange(channelExchangeName).then(() =>{
            return this._amqpChannels[`${currentTime}`].assertQueue(streamChannelQueue, this._streamQueueArguments);
          }).then(() => {
            return this._amqpChannels[`${currentTime}`].bindQueue(streamChannelQueue, channelExchangeName, routingKey);
          }).then(() => {
            return this._amqpChannels[`${currentTime}`].consume(streamChannelQueue, (message) => {
              callback(this._parseContent(message));
            }, merge(this._subscribeArgs, opts) );
          });
        }
        return promisesChain;
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
  _streamQueue(stream) {
    return `${stream}.${this._liveStreamSuffix}`;
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
  _streamChannelQueue(deviceId, channel, currentTime) {
    const prefix = currentTime || new Date().getTime();
    return `${prefix}-${this._connectionParams.client}-${this._channelExchange(deviceId, channel)}.${this._liveStreamSuffix}`;
  }

}

// Remove unwanted methods inherited from AmqpClient
delete AmqpStreamClient.onReceive;
delete AmqpStreamClient.publish;
delete AmqpStreamClient._routingKeyFor;

export default AmqpStreamClient;
