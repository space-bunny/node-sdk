/**
 * A module that exports an StompStreamClient client
 * which inherits from the Stomp base client
 * @module StompStreamClient
 */

import md5 from 'js-md5';
// Import some helpers modules
import { isNullOrUndefined } from 'util';

import Stomp, { IMessage } from '@stomp/stompjs';

import StompMessage from '../messages/stompMessage';
import { ILiveStreamHook } from '../spacebunny';
// Import StompClient main module from which StompStreamClient inherits
import StompClient from './stompClient';

export type IStompCallback = (message: StompMessage) => Promise<void>;
export interface IStompLiveStreamHook extends ILiveStreamHook {
  callback: IStompCallback;
  ack?: 'client';
}

class StompStreamClient extends StompClient {
  protected subscriptions: { [key: string]: Stomp.StompSubscription };

  protected defaultResource: string;

  protected defaultPattern: string;

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  constructor(opts: any = {}) {
    super(opts);
    this.subscriptions = {};
  }

  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */
  public streamFrom = async (streamHooks: Array<IStompLiveStreamHook> = [], opts: any = {}): Promise<Array<string | void>> => {
    const promises = [];
    for (let index = 0; index < streamHooks.length; index += 1) {
      const streamHook = streamHooks[index];
      const promise = this.addStreamHook(streamHook, opts);
      promises.push(promise);
    }
    return Promise.all(promises);
  }

  /**
   * Unsubscribe client from a topic
   *
   * @param {String} subscriptionId - subscription ID
   * @return a promise containing the result of the operation
   */
  unsubscribe = (subscriptionId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Invalid connection'));
      } else {
        const subscription = this.subscriptions[subscriptionId];
        if (!isNullOrUndefined(subscription)) {
          subscription.unsubscribe();
          delete this.subscriptions[subscriptionId];
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
  disconnect = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        resolve(true);
      } else {
        try {
          const subscriptions = Object.keys(this.subscriptions);
          for (let index = 0; index < subscriptions.length; index += 1) {
            const subscription = this.subscriptions[index];
            subscription.unsubscribe();
          }
          this.subscriptions = {};
          this.stompClient.deactivate();
          this.stompClient = undefined;
          this.emit('disconnect');
        } catch (error) {
          reject(error);
        }
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
  public addStreamHook = async (streamHook: IStompLiveStreamHook, opts: any = { }): Promise<string | void> => {
    return new Promise((resolve, reject) => {
      try {
        const {
          stream = undefined, deviceId = undefined,
          channel = undefined, routingKey = undefined,
          topic = undefined, cache = true, callback = undefined
        } = streamHook;
        if (isNullOrUndefined(stream) && (isNullOrUndefined(channel) || isNullOrUndefined(deviceId))) {
          this.log('error', 'Missing Stream or Device ID and Channel');
          return;
        }
        if (isNullOrUndefined(callback)) {
          this.log('error', 'Missing Callback');
          return;
        }
        let streamTopic = '';
        let tempQueue = '';
        if (stream) {
          if (!this.liveStreamExists(stream)) {
            console.error(`Stream ${stream} does not exist`); // eslint-disable-line no-console
            resolve(undefined);
          }
          if (cache) {
            // Cached streams are connected to the existing live stream queue
            streamTopic = this.cachedStreamTopicFor({ stream });
          } else {
            // Uncached streams are connected to the stream exchange and create a temp queue
            streamTopic = this.streamTopicFor({ stream, routingKey, topic });
            tempQueue = this.tempQueue(stream, this.liveStreamSuffix);
          }
        } else {
          // else if current hook is channel (or a couple deviceId, channel)
          // creates a temp queue, binds to channel exchange and starts consuming
          streamTopic = this.streamChannelTopicFor({
            deviceId, channel, routingKey, topic
          });
          tempQueue = this.tempQueue(deviceId, channel);
        }
        const subscriptionHeaders = {};
        if (tempQueue) { subscriptionHeaders['x-queue-name'] = tempQueue; }
        const messageCallback = (message: IMessage) => {
          // Create message object
          const stompMessage = new StompMessage({ message, receiverId: this.client, subscriptionOpts: opts });
          const ackNeeded = this.autoAck(opts.ack);
          // Check if should be accepted or not
          if (stompMessage.blackListed()) {
            if (ackNeeded) { message.nack(); }
            return;
          }
          // Call message callback
          callback(stompMessage);
          // Check if ACK is needed
          if (ackNeeded) { message.ack(); }
        };
        const subscriptionId = md5(`${tempQueue}-${streamTopic}`);
        const subscription = this.stompClient.subscribe(streamTopic, messageCallback, {
          ...subscriptionHeaders,
          id: subscriptionId
        });
        this.subscriptions[subscriptionId] = subscription;
        resolve(subscriptionId);
      } catch (error) {
        this.log('error', error);
        reject(error);
      }
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
  streamChannelTopicFor = (params: any = {}) => {
    const {
      deviceId = undefined, channel = undefined, type = this.defaultResource,
      routingKey = this.defaultPattern, topic = undefined
    } = params;
    let resource = deviceId || '';
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
  private cachedStreamTopicFor = (params: any = {}) => {
    const {
      stream = undefined, type = this.existingQueuePrefix
    } = params;
    const topic = stream || '';
    return `/${type}/${topic}.${this.liveStreamSuffix}`;
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
  streamTopicFor = (params: any = {}) => {
    const {
      stream = undefined, type = this.defaultResource, routingKey = this.defaultPattern
    } = params;
    const resource = stream || '';
    return `/${type}/${resource}.${this.liveStreamSuffix}/${routingKey}`;
  }
}

// Remove unwnated methods inherited from StompClient
delete StompStreamClient.prototype.onReceive;
delete StompStreamClient.prototype.publish;
delete StompStreamClient.prototype.subcriptionFor;
delete StompStreamClient.prototype.destinationFor;

export default StompStreamClient;
