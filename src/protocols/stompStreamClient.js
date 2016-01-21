/**
 * A module that exports an StompStreamClient client
 * which inherits from the Stomp base client
 * @module StompStreamClient
 */

// Import some helpers modules
import merge from 'merge';
import Promise from 'bluebird';

// Import StompClient main module from which StompStreamClient inherits
import StompClient from './stompClient';
import SpaceBunnyErrors from '../spacebunnyErrors';

class StompStreamClient extends StompClient {

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  constructor(opts) {
    super(opts);
    this._subscriptions = {};
    this._channelExchangePrefix = 'exchange';
    this._defaultPattern = '#';
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

  /**
   * Unsubscribe client from a topic
   *
   * @param {String} deviceId - Device uuid
   * @param {String} channel - channel name
   * @return a promise containing the result of the operation
   */
  unsubscribe(deviceId, channel) {
    return new Promise((resolve, reject) => {
      if (this._stompConnection === undefined) {
        reject('Invalid connection');
      } else {
        const topic = this._topicFor(deviceId, channel);
        const subscription = this._subscriptions[topic];
        subscription.unsubscribe(topic);
        delete this._subscriptions[topic];
        resolve(true);
      }
    });
  }

  /**
   * Destroy the connection between the stomp client and broker
   *
   * @return a promise containing the result of the operation
   */
  disconnect() {
    return new Promise((resolve, reject) => {
      if (this._stompConnection === undefined) {
        reject('Invalid connection');
      } else {
        for (const subscription in this._subscriptions) {
          this._subscriptions[subscription].unsubscribe();
        }
        this._subscriptions = {};
        this._stompConnection.disconnect(function() {
          this._stompConnection = undefined;
          resolve(true);
        }).catch(function(reason) {
          reject(reason);
        });
      }
    });
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
    opts = merge({}, opts);
    // Receive messages from imput queue
    const stream = streamHook.stream;
    const deviceId = streamHook.deviceId;
    const channel = streamHook.channel;
    const emptyFunction = function() { return undefined; };
    const callback = streamHook.callback || emptyFunction;
    if (stream === undefined && (channel === undefined || deviceId === undefined)) {
      throw new SpaceBunnyErrors.MissingStreamConfigurations('Missing Stream or Device ID and Channel');
    }
    return new Promise((resolve, reject) => {
      this._connect().then((client) => {
        let topic = undefined;
        if (stream) {
          topic = this._streamTopicFor(stream);
        } else {
          topic = this._streamChannelTopicFor(deviceId, channel);
        }
        console.log(`streaming from ${topic}`); // eslint-disable-line no-console
        const subscription = client.subscribe(topic, function(message) {
          callback(message);
        }, function(reason) {
          reject(reason);
        });
        this._subscriptions[topic] = subscription;
        resolve(true);
      }).catch(function(reason) {
        reject(reason);
      });
    });
  }

  /**
   * Generate the subscription string for a specific channel
   *
   * @private
   * @param {String} deviceId - deviceId from which you want to stream from
   * @param {String} channel - channel name from which you want to stream from
   * @param {String} type - resource type on which subscribe or publish [exchange/queue]
   * @param {String} pattern - binding pattern
   * @return a string that represents the topic name for that channel
   */
  _streamChannelTopicFor(deviceId, channel, type, pattern) {
    return `/${type || this._channelExchangePrefix}/${deviceId}.${channel}/${pattern || this._defaultPattern}`;
  }

  /**
   * Generate the subscription string for a specific channel
   *
   * @private
   * @param {String} stream - stream identifier from which you want to stream from
   * @param {String} type - resource type on which subscribe or publish [exchange/queue]
   * @param {String} pattern - binding pattern
   * @return a string that represents the topic name for that channel
   */
  _streamTopicFor(stream, type, pattern) {
    return `/${type || this._existingQueuePrefix}/${stream}.${this._liveStreamSuffix}/${pattern || this._defaultPattern}`;
  }

}

// Remove unwnated methods inherited from StompClient
delete StompStreamClient.onReceive;
delete StompStreamClient.publish;
delete StompStreamClient._subcriptionFor;
delete StompStreamClient._destinationFor;

export default StompStreamClient;
