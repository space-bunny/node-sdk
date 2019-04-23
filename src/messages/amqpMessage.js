/**
 * A wrapper for the message object
 * @module Message
 */
import _ from 'lodash';
import { parseContent } from '../utils';
import CONFIG from '../../config/constants';

class AmqpMessage {

  message: any;
  content: any;
  fields: any;
  properties: any;
  channel: any;
  senderId: string;
  channelName: string
  _receiverId: string;
  _discardMine: boolean;
  _discardFromApi: boolean;

  /**
   * @constructor
   * @param {Object} message - the message received from the channel
   * @param {String} receiverId - the receiver id
   * @param {Object} opts - subscription options
   */
  constructor(opts: any = {}) {
    const {
      message = undefined, receiverId = undefined, channel = undefined, subscriptionOpts = {}
    } = opts;
    this.message = message;
    this.content = parseContent(_.get(message, 'content', {}));
    this.fields = _.get(message, 'fields', {});
    this.properties = _.get(message, 'properties', {});
    this.channel = channel;
    try {
      const [senderId, channelName] = this.fields.routingKey.split('.');
      this.senderId = senderId;
      this.channelName = channelName;
    } catch (ex) {
      console.error('Wrong routing key format'); // eslint-disable-line no-console
    }
    this._receiverId = receiverId || '';
    this._discardMine = subscriptionOpts.discardMine || false;
    this._discardFromApi = subscriptionOpts.discardFromApi || false;
  }

  /**
   * Check if a message should be accepted of rejected
   *
   * @return Boolean - true if should be not considered, false otherwise
   */
  blackListed = () => {
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
  fromApi = () => {
    return (this.properties.headers && this.properties.headers[CONFIG.fromApiHeader]);
  }

  ack = (opts: any = {}) => {
    const { allUpTo = false } = opts;
    this.channel.nack(this.message, allUpTo);
  }

  nack = (opts: any = {}) => {
    const { allUpTo = false, requeue = true } = opts;
    this.channel.nack(this.message, allUpTo, requeue);
  }
}

export default AmqpMessage;
