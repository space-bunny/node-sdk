/**
 * A wrapper for the message object
 * @module Message
 */
import { parseContent } from '../utils';

const { CONFIG } = require('../../config/constants');

class AmqpMessage {
  /**
   * @constructor
   * @param {Object} message - the message received from the channel
   * @param {String} receiverId - the receiver id
   * @param {Object} opts - subscription options
   */
  constructor(opts = {}) {
    const {
      message = undefined, receiverId = undefined, channel = undefined, subscriptionOpts = {}
    } = opts;
    this.message = message;
    this.content = parseContent(message.content);
    this.fields = message.fields;
    this.properties = message.properties;
    this.channel = channel;
    try {
      [this.senderId, this.channelName] = this.fields.routingKey.split('.');
    } catch (ex) {
      console.error('Wrong routing key format'); // eslint-disable-line no-console
    }
    this._receiverId = receiverId;
    this._discardMine = subscriptionOpts.discardMine || false;
    this._discardFromApi = subscriptionOpts.discardFromApi || false;
  }

  /**
   * Check if a message should be accepted of rejected
   *
   * @return Boolean - true if should be not considered, false otherwise
   */
  blackListed() {
    if (this._discardMine && this._receiverId === this.senderId && !this.fromApi()) return true;
    if (this._discardFromApi && this.fromApi()) return true;
    return false;
  }

  /**
   * Check if a message comes from API
   * Check if it contains 'x-from-sb-api' header
   *
   * @return Boolean - true if it comes from API, false otherwise
   */
  fromApi() {
    return (this.properties.headers && this.properties.headers[CONFIG.fromApiHeader]);
  }

  ack(opts = {}) {
    const { allUpTo = false } = opts;
    this.channel.nack(this.message, allUpTo);
  }

  nack(opts = {}) {
    const { allUpTo = false, requeue = true } = opts;
    this.channel.nack(this.message, allUpTo, requeue);
  }
}

export default AmqpMessage;
