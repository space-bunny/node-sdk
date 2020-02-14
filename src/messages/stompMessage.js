/**
* A wrapper for the message object
* @module Message
*/
import _ from 'lodash';

import { parseContent } from '../utils';
import CONFIG from '../../config/constants';

class StompMessage {

  message: any;
  body: any;
  content: any;
  headers: any;
  channel: any;
  senderId: string;
  channelName: string
  _receiverId: string;
  _discardMine: boolean;
  _discardFromApi: boolean;

  /**
  * @constructor
  * @param {Object} opts - subscription options
  */
  constructor(opts: any = {}) {
    const {
      message = undefined, receiverId = undefined, subscriptionOpts = {}
    } = opts;
    this.message = message;
    this.body = _.get(message, 'body', {});
    this.content = parseContent(this.body);
    this.headers = _.get(message, 'headers', {});
    try {
      const destination = this.headers.destination.split('/');
      const [senderId, channelName] = destination[destination.length - 1].split('.');
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
    return (this.headers && this.headers[CONFIG.fromApiHeader]);
  }

  ack = () => {
    this.message.ack();
  }

  nack = () => {
    this.message.nack();
  }
}

export default StompMessage;
