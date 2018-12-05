/**
* A wrapper for the message object
* @module Message
*/

import { parseContent } from '../utils';

const { CONFIG } = require('../../config/constants');

class StompMessage {
  /**
  * @constructor
  * @param {Object} opts - subscription options
  */
  constructor(opts = {}) {
    const {
      message = undefined, receiverId = undefined, subscriptionOpts = {}
    } = opts;
    this.message = message;
    this.body = parseContent(message.body);
    this.content = this.body;
    this.headers = message.headers;
    try {
      const destination = this.headers.destination.split('/');
      [this.senderId, this.channelName] = destination[destination.length - 1].split('.');
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
    return (this.headers && this.headers[CONFIG.fromApiHeader]);
  }

  ack() {
    this.message.ack();
  }

  nack() {
    this.message.nack();
  }
}

export default StompMessage;
