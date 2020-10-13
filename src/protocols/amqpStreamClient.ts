/**
 * A module that exports an AmqpStreamClient client
 * which inherits from the Amqp base client
 * @module AmqpStreamClient
 */

import * as amqp from 'amqplib';
import { isNullOrUndefined } from 'util';

import { ILiveStreamHook, ISpaceBunnyParams } from '../spacebunny';
import AmqpClient, { IAmqpCallback, IAmqpConsumeOptions, IRoutingKey } from './amqpClient';

export interface IAmqpLiveStreamHook extends ILiveStreamHook {
  callback: IAmqpCallback;
}

export type IAmqpStreamListener = {
  streamHook: IAmqpLiveStreamHook;
  opts?: IAmqpConsumeOptions;
  consumerTag?: string;
}

class AmqpStreamClient extends AmqpClient {
  private defaultStreamRoutingKey: string;

  private streamQueueArguments: amqp.Options.AssertQueue;

  private amqpStreamListeners: { [name: string]: IAmqpStreamListener };

  /**
   * @constructor
   * @param {ISpaceBunnyParams} opts - options must contain client and secret for access keys
   */
  constructor(opts: ISpaceBunnyParams = {}) {
    super(opts);
    this.defaultStreamRoutingKey = '#';
    this.streamQueueArguments = { exclusive: true, autoDelete: true, durable: false };
    this.amqpStreamListeners = {};
    this.on('connect', () => { void this.bindAmqpStreamListeners(); });
    this.on('disconnect', () => { this.amqpStreamListeners = {}; });
    this.on('channelClose', () => { this.clearStreamConsumers(); });
  }

  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { name: {string}, deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */
  public streamFrom = async (streamHooks: IAmqpLiveStreamHook | Array<IAmqpLiveStreamHook> = [], opts: IAmqpConsumeOptions = {}): Promise<Array<string|void>> => {
    const hooks: Array<IAmqpLiveStreamHook> = Array.isArray(streamHooks) ? streamHooks : [streamHooks];
    const names: string[] = [];
    for (let index = 0; index < hooks.length; index += 1) {
      const streamHook = hooks[index];
      const name: string = this.addAmqpStreamListener(streamHook, opts);
      // eslint-disable-next-line no-await-in-loop
      await this.bindAmqpStreamListener(name);
      names.push(name);
    }
    return names;
  }

  public removeAmqpStreamListener = async (name: string): Promise<void> => {
    if (isNullOrUndefined(this.amqpStreamListeners[name])) {
      this.log('error', `AMQP listener ${name} does not exist.`);
      return;
    }
    await this.unsubscribe(this.amqpStreamListeners[name].consumerTag);
    delete this.amqpStreamListeners[name];
  }

  // ------------ PRIVATE METHODS -------------------

  private clearStreamConsumers = (): void => {
    const names = Object.keys(this.amqpStreamListeners);
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      const listener = this.amqpStreamListeners[name];
      delete listener.consumerTag;
    }
  }

  private addAmqpStreamListener = (streamHook: IAmqpLiveStreamHook, opts: IAmqpConsumeOptions = {}): string => {
    const name = `subscription-${new Date().getTime()}`;
    this.amqpStreamListeners[name] = { streamHook, opts };
    return name;
  }

  private bindAmqpStreamListeners = async (): Promise<void> => {
    const names = Object.keys(this.amqpStreamListeners);
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      // eslint-disable-next-line no-await-in-loop
      await this.bindAmqpStreamListener(name);
    }
  }

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
  private bindAmqpStreamListener = async (name: string): Promise<void> => {
    if (isNullOrUndefined(this.amqpStreamListeners[name])) {
      this.log('error', `Listner ${name} does not exist.`);
      return;
    }
    if (!isNullOrUndefined(this.amqpStreamListeners[name].consumerTag)) {
      this.log('warn', `Listner ${name} already bound to a consumer.`);
      return;
    }
    const { streamHook, opts } = this.amqpStreamListeners[name];
    // Receive messages from stream
    const {
      stream = undefined, deviceId = undefined, channel = undefined, cache = true,
      topic = undefined, routingKey = undefined, callback = undefined
    } = streamHook;
    const noAck = isNullOrUndefined(opts.ack);
    if (isNullOrUndefined(stream) && (isNullOrUndefined(channel) || isNullOrUndefined(deviceId))) {
      throw new Error(`${this.getClassName()} - Missing Stream or Device ID and Channel`);
    }
    if (isNullOrUndefined(callback)) {
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
      this.log('debug', `Streaming from ${streamName}..`);
      this.amqpStreamListeners[name].consumerTag = consumerTag;
    } catch (error) {
      this.log('error', 'Error adding stream hook', streamHook);
      throw error;
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
    const { deviceId = '', channel = '', routingKey = '', topic = '' } = opts;
    if (routingKey.length === 0 && deviceId.length === 0) {
      // if both routingKey and deviceId are empty return default routingKey
      return this.defaultStreamRoutingKey;
    }
    if (routingKey.length > 0) {
      return routingKey; // return routing key if present
    }
    let streamRoutingKey = deviceId || '';
    if (channel) { streamRoutingKey += `.${channel}`; }
    if (topic) { streamRoutingKey += `.${topic}`; }
    return `${streamRoutingKey}`;
  }
}

// Remove unwanted methods inherited from AmqpClient
delete AmqpStreamClient.prototype.onMessage;
delete AmqpStreamClient.prototype.publish;

export default AmqpStreamClient;
