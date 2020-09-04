/**
 * A module that exports an StompStreamClient client
 * which inherits from the Stomp base client
 * @module StompStreamClient
 */

import md5 from 'md5';
// Import some helpers modules
import { isNullOrUndefined } from 'util';

import Stomp from '@stomp/stompjs';

import StompMessage from '../messages/stompMessage';
import { ILiveStreamHook } from '../spacebunny';
// Import StompClient main module from which StompStreamClient inherits
import StompClient, { IStompConsumeOptions } from './stompClient';

export type IStompCallback = (message: StompMessage) => Promise<void>;
export interface IStompLiveStreamHook extends ILiveStreamHook {
  callback: IStompCallback;
  ack?: 'client';
}

export interface IStompLiveStreamDestination extends ILiveStreamHook {
  type?: string;
}

export type IStompStreamListener = {
  streamHook: IStompLiveStreamHook;
  opts?: IStompConsumeOptions;
  subscription?: Stomp.StompSubscription;
}

class StompStreamClient extends StompClient {
  private defaultPattern: string;

  private stompStreamListeners: { [name: string]: IStompStreamListener } = {};

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  constructor(opts: any = {}) {
    super(opts);
    this.defaultPattern = '#';
    this.stompStreamListeners = {};
    this.on('connect', () => { void this.bindStompStreamListeners(); });
    this.on('disconnect', () => { this.stompStreamListeners = {}; });
  }

  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */
  public streamFrom = async (streamHooks: IStompLiveStreamHook | Array<IStompLiveStreamHook> = [], opts: any = {}): Promise<Array<string | void>> => {
    const hooks: Array<IStompLiveStreamHook> = Array.isArray(streamHooks) ? streamHooks : [streamHooks];
    const names: string[] = [];
    for (let index = 0; index < hooks.length; index += 1) {
      const streamHook = hooks[index];
      const name = this.addStompStreamListener(streamHook, opts);
      if (this.isConnected()) {
        // eslint-disable-next-line no-await-in-loop
        await this.bindStompStreamListener(name);
      }
      names.push(name);
    }
    return names;
  }

  public removeStompStreamListener = async (name: string): Promise<void> => {
    if (isNullOrUndefined(this.stompStreamListeners[name])) {
      this.log('error', `STOMP listener ${name} does not exist.`);
      return;
    }
    await this.unsubscribe(name);
    delete this.stompStreamListeners[name];
  }

  /**
 * Destroy the connection between the stomp client and broker
 *
 * @return a promise containing the result of the operation
 */
  public disconnect = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        resolve(true);
      } else {
        try {
          const subscriptions = Object.keys(this.stompStreamListeners);
          for (let index = 0; index < subscriptions.length; index += 1) {
            const name = subscriptions[index];
            const { subscription } = this.stompStreamListeners[name];
            if (!isNullOrUndefined(subscription)) {
              subscription.unsubscribe();
            }
            delete this.stompStreamListeners[name];
          }
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
   * Unsubscribe client from a topic
   *
   * @param {String} subscriptionId - subscription ID
   * @return a promise containing the result of the operation
   */
  private unsubscribe = (name: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Invalid connection'));
      } else {
        const { subscription } = this.stompStreamListeners[name];
        if (!isNullOrUndefined(subscription)) {
          subscription.unsubscribe();
          delete this.stompStreamListeners[name].subscription;
          resolve(true);
        } else {
          reject(new Error('Subscription not found'));
        }
      }
    });
  }

  private addStompStreamListener = (streamHook: IStompLiveStreamHook, opts: IStompConsumeOptions = {}): string => {
    const name = `subscription-${new Date().getTime()}`;
    this.stompStreamListeners[name] = { streamHook, opts };
    return name;
  }

  private bindStompStreamListeners = async (): Promise<void> => {
    const names = Object.keys(this.stompStreamListeners);
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      // eslint-disable-next-line no-await-in-loop
      await this.bindStompStreamListener(name);
    }
  }

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
  public bindStompStreamListener = async (name: string): Promise<string | void> => {
    if (isNullOrUndefined(this.stompStreamListeners[name])) {
      this.log('error', `Listner ${name} does not exist.`);
      return;
    }
    if (!isNullOrUndefined(this.stompStreamListeners[name].subscription)) {
      this.log('warn', `Listner ${name} already bound to a consumer.`);
      return;
    }
    return new Promise((resolve, reject) => {
      try {
        const { streamHook, opts } = this.stompStreamListeners[name];
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
        const subscriptionId = md5(`${tempQueue}-${streamTopic}`);
        const subscription = this.stompClient.subscribe(streamTopic,
          this.consumeCallback.bind(this, callback, opts), {
            ...subscriptionHeaders,
            id: subscriptionId
          });
        this.stompStreamListeners[name].subscription = subscription;
        this.log('info', `Client subscribed to topic ${streamTopic}`);
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
  streamChannelTopicFor = (params: IStompLiveStreamDestination = {}): string => {
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
  private cachedStreamTopicFor = (params: IStompLiveStreamDestination = {}): string => {
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
  streamTopicFor = (params: IStompLiveStreamDestination = {}): string => {
    const {
      stream = undefined, type = this.defaultResource, routingKey = this.defaultPattern
    } = params;
    const resource = stream || '';
    return `/${type}/${resource}.${this.liveStreamSuffix}/${routingKey}`;
  }
}

// Remove unwnated methods inherited from StompClient
delete StompStreamClient.prototype.onMessage;
delete StompStreamClient.prototype.publish;
delete StompStreamClient.prototype.subcriptionFor;
delete StompStreamClient.prototype.destinationFor;

export default StompStreamClient;
