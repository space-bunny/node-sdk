import * as amqp from 'amqplib';
/**
 * A wrapper for the message object
 * @module Message
 */
import { get } from 'lodash';

import CONFIG from '../config/constants';
import { parseContent } from '../utils';

class AmqpMessage {
  private message: amqp.ConsumeMessage | null;

  private content: object;

  private channel: amqp.Channel | amqp.ConfirmChannel;

  private senderId: string;

  private channelName: string

  private receiverId: string;

  private discardMine: boolean;

  private discardFromApi: boolean;

  /**
   * @constructor
   * @param {Object} message - the message received from the channel
   * @param {String} receiverId - the receiver id
   * @param {Object} opts - subscription options
   */
  constructor(opts: {
    message: amqp.ConsumeMessage | null; receiverId: string; channel: amqp.Channel | amqp.ConfirmChannel,
    subscriptionOpts: { discardMine?: boolean; discardFromApi?: boolean }; }) {
    const { message = undefined, receiverId = '', channel = undefined, subscriptionOpts = {} } = opts;
    const { discardMine = false, discardFromApi = false } = subscriptionOpts;
    this.message = message;
    this.content = parseContent((message) ? message.content : {});
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
  blackListed = () => {
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
  fromApi = () => {
    return (this.message.properties.headers && this.message.properties.headers[CONFIG.fromApiHeader]);
  }

  ack = (opts: any = {}) => {
    const { allUpTo = false } = opts;
    this.channel.nack(this.message, allUpTo);
  }

  nack = (opts: any = {}) => {
    const { allUpTo = false, requeue = true } = opts;
    this.channel.nack(this.message, allUpTo, requeue);
  }

  getContent = (): object => {
    return this.content;
  }

  getChannelName = (): string => {
    return this.channelName;
  }
}

export default AmqpMessage;
