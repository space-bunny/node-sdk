/**
 * A module that exports an StompStreamClient client
 * which inherits from the Stomp base client
 * @module StompStreamClient
 */

// Import some helpers modules
import _ from 'lodash';
import Promise from 'bluebird';
import md5 from 'js-md5';

// Import StompClient main module from which StompStreamClient inherits
import StompClient from './stompClient';

const { CONFIG } = require('../../config/constants');

class StompStreamClient extends StompClient {
  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  constructor(opts = {}) {
    super(opts);
    this._subscriptions = {};
    const stompStreamOpts = CONFIG.stomp.stream;
    this._defaultResource = CONFIG.stomp.defaultResource;
    this._defaultPattern = stompStreamOpts.defaultPattern;
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
          subscription.unsubscribe();
          delete this._subscriptions[subscriptionId];
          resolve(true);
        } else {
          reject(new Error('Subscription not found'));
        }
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
      if (!this.isConnected()) {
        reject(new Error('Invalid connection'));
      } else {
        const subscriptions = Object.keys(this._subscriptions);
        subscriptions.forEach((subscription) => {
          if (this._subscriptions[subscription]) {
            this._subscriptions[subscription].unsubscribe();
          }
        });
        this._subscriptions = {};
        this._stompConnection.disconnect(() => {
          this._stompConnection = undefined;
          resolve(true);
        }).catch((reason) => {
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
  _attachStreamHook(streamHook, opts = {}) {
    return new Promise((resolve, reject) => {
      // let localOpts = _.cloneDeep(opts);
      // localOpts = _.merge({}, localOpts);
      // Receive messages from imput queue
      const {
        stream = undefined, deviceId = undefined, channel = undefined, routingKey = undefined, topic = undefined
      } = streamHook;
      const cache = (typeof (streamHook.cache) !== 'boolean') ? true : streamHook.cache;
      const emptyFunction = () => { return undefined; };
      const callback = streamHook.callback || emptyFunction;
      if (stream === undefined && deviceId === undefined) {
        reject(new Error('Missing Stream or Device ID'));
      }
      this.connect().then((client) => {
        let streamTopic;
        let tempQueue;
        if (stream) {
          if (!this.liveStreamExists(stream)) {
            console.error(`Stream ${stream} does not exist`); // eslint-disable-line no-console
            resolve(false);
          }
          if (cache) {
            // Cached streams are connected to the existing live stream queue
            streamTopic = this._cachedStreamTopicFor({ stream });
          } else {
            // Uncached streams are connected to the stream exchange and create a temp queue
            streamTopic = this._streamTopicFor({ stream, routingKey, topic });
            tempQueue = this.tempQueue(stream, this._liveStreamSuffix);
          }
        } else {
          // else if current hook is channel (or a couple deviceId, channel)
          // creates a temp queue, binds to channel exchange and starts consuming
          streamTopic = this._streamChannelTopicFor({
            deviceId, channel, routingKey, topic
          });
          tempQueue = this.tempQueue(deviceId, channel);
        }
        const subscriptionHeaders = {};
        if (tempQueue) { subscriptionHeaders['x-queue-name'] = tempQueue; }
        const messageCallback = (message) => {
          callback(this._parseContent(message.body), message.headers);
        };
        try {
          const subscriptionId = md5(`${tempQueue}-${streamTopic}`);
          const subscription = client.subscribe(streamTopic, messageCallback, {
            ...subscriptionHeaders,
            id: subscriptionId
          });
          this._subscriptions[subscriptionId] = subscription;
          resolve(_.merge(streamHook, { id: subscriptionId }));
        } catch (e) {
          console.error(e); // eslint-disable-line no-console
          resolve(undefined);
        }
      }).catch((reason) => {
        console.error(reason); // eslint-disable-line no-console
        resolve(undefined);
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
   * @param {String} routingKey - binding pattern
   * @return a string that represents the topic name for that channel
   */
  _streamChannelTopicFor(params = {}) {
    const {
      deviceId = undefined, channel = undefined, type = this._defaultResource,
      routingKey = this._defaultPattern, topic = undefined
    } = params;
    let resource = deviceId;
    if (channel) {
      resource += `.${channel}`;
    }
    let finalTopic = resource;
    if (topic) {
      finalTopic += `.${topic}`;
    } else {
      finalTopic = routingKey;
    }
    return `/${type}/${resource}/${finalTopic}`;
  }

  /**
   * Generate the subscription string for cached live streams
   *
   * @private
   * @param {String} stream - stream name from which you want to stream
   * @param {String} type - resource type on which subscribe or publish [exchange/queue]
   * @return a string that represents the topic name for that channel
   */
  _cachedStreamTopicFor(params = {}) {
    const {
      stream = undefined, type = this._existingQueuePrefix
    } = params;
    const topic = stream;
    return `/${type}/${topic}.${this._liveStreamSuffix}`;
  }

  /**
   * Generate the subscription for live streams without caching
   *
   * @private
   * @param {String} stream - stream name from which you want to stream
   * @param {String} type - resource type on which subscribe or publish [exchange/queue]
   * @param {String} routingKey - binding pattern
   * @return a string that represents the topic name for that channel
   */
  _streamTopicFor(params = {}) {
    const {
      stream = undefined, type = this._defaultResource, routingKey = this._defaultPattern
    } = params;
    const resource = stream;
    return `/${type}/${resource}.${this._liveStreamSuffix}/${routingKey}`;
  }
}

// Remove unwnated methods inherited from StompClient
delete StompStreamClient.onReceive;
delete StompStreamClient.publish;
delete StompStreamClient._subcriptionFor;
delete StompStreamClient._destinationFor;

export default StompStreamClient;
