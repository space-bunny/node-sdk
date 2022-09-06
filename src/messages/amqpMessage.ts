import * as amqp from 'amqplib';

import { ISpaceBunnySubscribeOptions } from '../spacebunny';
/**
 * A wrapper for the message object
 * @module Message
 */
import { parseContent } from '../utils';

class AmqpMessage {
  private message: amqp.ConsumeMessage | null;

  private content: Record<string, unknown>|string;

  private channel: amqp.Channel | amqp.ConfirmChannel;

  private senderId: string;

  private channelName: string

  private receiverId: string;

  private discardMine: boolean;

  private discardFromApi: boolean;

  private static FROM_API_HEADER = 'x-from-sb-api';

  /**
   * @constructor
   * @param {Object} message - the message received from the channel
   * @param {String} receiverId - the receiver id
   * @param {Object} opts - subscription options
   */
  constructor(opts: {
    message: amqp.ConsumeMessage | null; receiverId: string; channel: amqp.Channel | amqp.ConfirmChannel;
    subscriptionOpts: ISpaceBunnySubscribeOptions; }) {
    const { message = undefined, receiverId = '', channel = undefined, subscriptionOpts = {} } = opts;
    const { discardMine = false, discardFromApi = false } = subscriptionOpts;
    this.message = message;
    this.content = parseContent((message) ? message.content : '{}');
    this.channel = channel;
    try {
      const [senderId, channelName] = this.message.fields.routingKey.split('.');
      this.senderId = senderId;
      this.channelName = channelName;
    } catch (ex) {
      console.error('Wrong routing key format'); // eslint-disable-line no-console
    }
    this.receiverId = receiverId;
    this.discardMine = discardMine;
    this.discardFromApi = discardFromApi;
  }

  /**
   * Check if a message should be accepted of rejected
   *
   * @return Boolean - true if should be not considered, false otherwise
   */
  blackListed = (): boolean => {
    if (this.discardMine && this.receiverId === this.senderId && !this.fromApi()) return true;
    if (this.discardFromApi && this.fromApi()) return true;
    return false;
  }

  /**
   * Check if a message comes from API
   * Check if it contains 'x-from-sb-api' header
   *
   * @return Boolean - true if it comes from API, false otherwise
   */
  fromApi = (): boolean => {
    return (this.message.properties.headers && this.message.properties.headers[AmqpMessage.FROM_API_HEADER] === 'true');
  }

  ack = (opts: { allUpTo?: boolean } = {}): void => {
    const { allUpTo = false } = opts;
    this.channel.ack(this.message, allUpTo);
  }

  nack = (opts: { allUpTo?: boolean; requeue?: boolean } = {}): void => {
    const { allUpTo = false, requeue = true } = opts;
    this.channel.nack(this.message, allUpTo, requeue);
  }

  getContent = <T = Record<string, unknown> | string >(): T => {
    return this.content as T;
  }

  getProperties = (): amqp.MessageProperties => {
    return this.message.properties;
  }

  getFields = (): amqp.MessageFields => {
    return this.message.fields;
  }

  getChannelName = (): string => {
    return this.channelName;
  }
}

export default AmqpMessage;
