/**
 * A module that exports an StompClient client
 * which inherits from the SpaceBunny base client
 * @module StompClient
 */

// Import some helpers modules
import merge from 'merge';
import Promise from 'bluebird';

// Import SpaceBunny main module from which StompClient inherits
import StompClient from './stomp_client';
import SpaceBunnyErrors from '../spacebunny_errors';

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */
class StompStreamClient extends StompClient {
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
   * Destroy the connection between the stomp client and broker
   *
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
   * @private
   * Start consuming messages from a device's channel
   * It generates an auto delete queue from which consume
   * and binds it to the channel exchange
   *
   * @param {Object} streamHook - Object containit hook info
   * { deviceId: {String}, channel: {String}, callback: {func}}
   * @param {Object} opts - connection options
   * @return a promise containing current connection
   */
  _attachStreamHook(streamHook, opts) {
    opts = merge({}, opts);
    // Receive messages from imput queue
    const deviceId = streamHook.deviceId;
    const channel = streamHook.channel;
    const emptyFunction = function() { return undefined; };
    const callback = streamHook.callback || emptyFunction;
    if (deviceId === undefined || channel === undefined) {
      throw new SpaceBunnyErrors.MissingStreamConfigurations('Missing Device ID or Channel');
    }
    return new Promise((resolve, reject) => {
      this._connect().then((client) => {
        const topic = this._topicFor(deviceId, channel);
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
   * @private
   * Generate the subscription string for a specific channel
   *
   * @param {String} type - resource type on which subscribe or publish [exchange/queue]
   * @param {String} channel - channel name on which you want to publish a message
   * @return a string that represents the topic name for that channel
   */
  _topicFor(deviceId, channel, type, pattern) {
    return `/${type || this._channelExchangePrefix}/${deviceId}.${channel}/${pattern || this._defaultPattern}`;
  }

}

// Remove unwnated methods inherited from StompClient
delete StompStreamClient.onReceive;
delete StompStreamClient.publish;
delete StompStreamClient._subcriptionFor;
delete StompStreamClient._destinationFor;

export default StompStreamClient;
