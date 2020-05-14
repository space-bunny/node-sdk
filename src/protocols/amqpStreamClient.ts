/**
 * A module that exports an AmqpStreamClient client
 * which inherits from the Amqp base client
 * @module AmqpStreamClient
 */

import * as amqp from 'amqplib';
import { isEmpty, isNil } from 'lodash';

import { ILiveStreamHook, ISpaceBunnyParams } from '../spacebunny';
import AmqpClient, { IAmqpCallback, IAmqpConsumeOptions, IRoutingKey } from './amqpClient';

export interface IAmqpLiveStreamHook extends ILiveStreamHook {
  callback: IAmqpCallback;
}

class AmqpStreamClient extends AmqpClient {
  private defaultStreamRoutingKey: string;

  private streamQueueArguments: amqp.Options.AssertQueue;

  private subscriptions: { [tag: string]: ILiveStreamHook };

  /**
   * @constructor
   * @param {ISpaceBunnyParams} opts - options must contain client and secret for access keys
   */
  constructor(opts: ISpaceBunnyParams = {}) {
    super(opts);
    this.subscriptions = {};
    this.defaultStreamRoutingKey = '#';
    this.streamQueueArguments = { exclusive: true, autoDelete: true, durable: false };
  }

  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { name: {string}, deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */
  public streamFrom = async (streamHooks: Array<IAmqpLiveStreamHook> = [], opts: IAmqpConsumeOptions = {}): Promise<Array<string|void>> => {
    const promises = [];
    const hooks: Array<IAmqpLiveStreamHook> = Array.isArray(streamHooks) ? streamHooks : [streamHooks];
    for (let index = 0; index < hooks.length; index += 1) {
      const streamHook = hooks[index];
      const promise = this.addStreamHook(streamHook, opts);
      promises.push(promise);
    }
    return Promise.all(promises);
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
  public addStreamHook = async (streamHook: IAmqpLiveStreamHook, opts: IAmqpConsumeOptions = {}): Promise<string> => {
    // Receive messages from stream
    const {
      stream = undefined, deviceId = undefined, channel = undefined, cache = true,
      topic = undefined, routingKey = undefined, callback = undefined
    } = streamHook;
    const noAck = isNil(opts.ack);
    if (isNil(stream) && (isNil(channel) || isNil(deviceId))) {
      throw new Error(`${this.getClassName()} - Missing Stream or Device ID and Channel`);
    }
    if (isNil(callback)) {
      throw new Error(`${this.getClassName()} - Missing Callback`);
    }
    const currentTime = new Date().getTime();
    let tempQueue: string;
    let streamName: string;
    const ch: amqp.Channel | amqp.ConfirmChannel = await this.createChannel('input');
    try {
      // if current hook is a stream
      // checks the existence of the stream queue and starts consuming
      if (stream) {
        if (!this.liveStreamExists(stream)) {
          throw new Error(`${this.getClassName()} - Stream ${stream} does not exist`);
        }
        if (cache) {
          // Cached streams are connected to the existing live stream queue
          tempQueue = this.cachedStreamQueue(stream);
          streamName = tempQueue;
          await ch.checkQueue(tempQueue);
        } else {
          // Uncached streams are connected to the stream exchange and create a temp queue
          const streamExchange = this.exchangeName(stream, this.liveStreamSuffix);
          streamName = streamExchange;
          tempQueue = this.tempQueue(stream, this.liveStreamSuffix, currentTime);
          await ch.checkExchange(streamExchange);
          await ch.assertQueue(tempQueue, this.streamQueueArguments);
          await ch.bindQueue(tempQueue, streamExchange, routingKey);
        }
      } else {
        // else if current hook is channel (or a couple deviceId, channel)
        // creates a temp queue, binds to channel exchange and starts consuming
        const channelExchangeName = this.exchangeName(deviceId, channel);
        streamName = channelExchangeName;
        tempQueue = this.tempQueue(deviceId, channel, currentTime);
        await ch.checkExchange(channelExchangeName);
        await ch.assertQueue(tempQueue, this.streamQueueArguments);
        await ch.bindQueue(tempQueue, channelExchangeName, this.streamRoutingKeyFor({ deviceId, channel, routingKey, topic }));
      }
      const { consumerTag } = await ch.consume(tempQueue,
        this.consumeCallback.bind(this, ch, callback, opts),
        { noAck });
      this.subscriptions[consumerTag] = streamHook;
      this.log('debug', `Streaming from ${streamName}..`);
      return consumerTag;
    } catch (error) {
      this.log('error', 'Error adding stream hook', streamHook);
      throw error;
    }
  }

  /**
   * Unsubscribe client from a topic
   *
   * @param {String} consumerTag - Consumer Tag
   * @return a promise containing the result of the operation
   */
  public unsubscribe = async (consumerTag: string): Promise<void> => {
    if (!this.isConnected()) {
      throw new Error(`${this.getClassName()} - Error trying to unsucscribe from ${consumerTag} on an invalid connection`);
    } else {
      try {
        const ch: amqp.Channel | amqp.ConfirmChannel | void = await this.createChannel('input');
        if (ch) {
          await ch.cancel(consumerTag);
        }
        delete this.subscriptions[consumerTag];
        this.log('debug', `Unsubscrbed ${consumerTag}`);
      } catch (error) {
        this.log('error', `Error unsubscribing from ${consumerTag}`);
        throw error;
      }
    }
  }

  /**
   * Generate the exchange name for a device's channel
   *
   * @private
   * @param {String} streamName - stream name from which you want to stream
   * @return a string that represents the stream queue
   */
  private cachedStreamQueue = (streamName: string) => {
    return `${streamName}.${this.liveStreamSuffix}`;
  }

  /**
   * Generate the exchange name for a device's channel
   *
   * @private
   * @param {Object} opts - opts
   * @return a string that represents the rounting key
   */
  private streamRoutingKeyFor = (opts: IRoutingKey = {}) => {
    const { deviceId = undefined, channel = undefined, routingKey = undefined, topic = undefined } = opts;
    if (isEmpty(routingKey) && isEmpty(deviceId)) {
      // if both routingKey and deviceId are empty return default routingKey
      return this.defaultStreamRoutingKey;
    }
    if (!isEmpty(routingKey)) {
      return routingKey; // return routing key if present
    }
    let streamRoutingKey = deviceId || '';
    if (channel) { streamRoutingKey += `.${channel}`; }
    if (topic) { streamRoutingKey += `.${topic}`; }
    return `${streamRoutingKey}`;
  }
}

// Remove unwanted methods inherited from AmqpClient
delete AmqpStreamClient.prototype.onReceive;
delete AmqpStreamClient.prototype.publish;
delete AmqpStreamClient.prototype.routingKeyFor;

export default AmqpStreamClient;
