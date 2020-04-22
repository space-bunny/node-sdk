/**
 * A module that exports an AmqpStreamClient client
 * which inherits from the Amqp base client
 * @module AmqpStreamClient
 */

import * as amqp from 'amqplib';
import { isEmpty, isNil, pick } from 'lodash';

import CONFIG from '../config/constants';
import AmqpMessage from '../messages/amqpMessage';
import { ISpaceBunnyParams } from '../spacebunny';
import AmqpClient, { IAmqpConsumeOptions, IRoutingKey } from './amqpClient';

export type IAmqpCallback = (message: any, fields: object, properties: object) => Promise<void>;
export interface ILiveStreamHook {
  stream?: string;
  deviceId?: string;
  channel?: string;
  routingKey?: string;
  topic?: string;
  cache?: boolean;
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
    const amqpStreamOptions = CONFIG.amqp.stream;
    this.defaultStreamRoutingKey = amqpStreamOptions.defaultStreamRoutingKey;
    this.streamQueueArguments = amqpStreamOptions.streamQueueArguments;
    this.subscriptions = {};
  }

  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { name: {string}, deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */
  public streamFrom = async (streamHooks: Array<ILiveStreamHook> = [], opts: IAmqpConsumeOptions = {}): Promise<Array<string|void>> => {
    const promises = [];
    for (let index = 0; index < streamHooks.length; index += 1) {
      const streamHook = streamHooks[index];
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
  public addStreamHook = async (streamHook: ILiveStreamHook, opts: IAmqpConsumeOptions = {}): Promise<string|void> => {
    // Receive messages from stream
    const {
      stream = undefined, deviceId = undefined, channel = undefined, cache = true,
      topic = undefined, routingKey = undefined, callback = undefined
    } = streamHook;
    const { ack = undefined, allUpTo = false, requeue = false } = opts;
    const noAck = isNil(ack);
    if (isNil(stream) && (isNil(channel) || isNil(deviceId))) {
      this.log('error', 'Missing Stream or Device ID and Channel');
      return;
    }
    if (isNil(callback)) {
      this.log('error', 'Missing Callback');
      return;
    }
    const currentTime = new Date().getTime();
    let tempQueue: string;
    let consumerTag: string;
    const ch: amqp.Channel | amqp.ConfirmChannel | void = await this.createChannel('input');
    if (ch) {
      try {
        const consumeCallback = (message: amqp.ConsumeMessage | null) => {
          if (isNil(message)) { return; }

          // Create message object
          const amqpMessage = new AmqpMessage({
            message,
            receiverId: this.getClient(),
            channel: ch,
            subscriptionOpts: pick(opts, ['discardMine', 'discardFromApi'])
          });
          const ackNeeded = this.autoAck(ack);
          // Check if should be accepted or not
          if (amqpMessage.blackListed()) {
            if (ackNeeded) { ch.nack(message, allUpTo, requeue); }
            return;
          }
          // Call message callback
          callback(amqpMessage.getContent(), amqpMessage.getFields(), amqpMessage.getProperties());
          // Check if ACK is needed
          if (ackNeeded) { ch.ack(message, allUpTo); }
        };
        // if current hook is a stream
        // checks the existence of the stream queue and starts consuming
        if (stream) {
          if (!this.liveStreamExists(stream)) {
            this.log('error', `Stream ${stream} does not exist`); // eslint-disable-line no-console
            return;
          }
          if (cache) {
            // Cached streams are connected to the existing live stream queue
            tempQueue = this.cachedStreamQueue(stream);
            await ch.checkQueue(tempQueue);
          } else {
            // Uncached streams are connected to the stream exchange and create a temp queue
            const streamExchange = this.exchangeName(stream, this.liveStreamSuffix);
            tempQueue = this.tempQueue(stream, this.liveStreamSuffix, currentTime);
            await ch.checkExchange(streamExchange);
            await ch.assertQueue(tempQueue, this.streamQueueArguments);
            await ch.bindQueue(tempQueue, streamExchange, routingKey);
          }
        } else {
          // else if current hook is channel (or a couple deviceId, channel)
          // creates a temp queue, binds to channel exchange and starts consuming
          const channelExchangeName = this.exchangeName(deviceId, channel);
          tempQueue = this.tempQueue(deviceId, channel, currentTime);
          await ch.checkExchange(channelExchangeName);
          await ch.assertQueue(tempQueue, this.streamQueueArguments);
          await ch.bindQueue(tempQueue, channelExchangeName, this.streamRoutingKeyFor({ deviceId, channel, routingKey, topic }));
        }
        consumerTag = (await ch.consume(tempQueue, consumeCallback, { noAck })).consumerTag;
        this.subscriptions[consumerTag] = streamHook;
        return consumerTag;
      } catch (error) {
        this.log('error', 'Error on addStreamHook');
        this.log('error', error);
      }
    }
    this.log('error', 'Trying to subscribe on an empty channel.');
  }

  /**
   * Unsubscribe client from a topic
   *
   * @param {String} consumerTag - Consumer Tag
   * @return a promise containing the result of the operation
   */
  public unsubscribe = async (consumerTag: string): Promise<void> => {
    if (!this.isConnected()) {
      this.log('error', `Error trying to unsucscribe from ${consumerTag} on an invalid connection`);
    } else {
      try {
        const ch: amqp.Channel | amqp.ConfirmChannel | void = await this.createChannel('input');
        if (ch) {
          await ch.cancel(consumerTag);
        }
        delete this.subscriptions[consumerTag];
      } catch (error) {
        this.log('error', `Error unsubscribing from ${consumerTag}`);
        this.log('error', error);
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
