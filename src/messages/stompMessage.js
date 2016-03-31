/**
 * A wrapper for the message object
 * @module Message
 */

const CONFIG = require('../../config/constants').CONFIG;

class StompMessage {

  /**
   * @constructor
   * @param {Object} message - the message received from the channel
   * @param {String} receiverId - the receiver id
   * @param {Object} opts - subscription options
   */
  constructor(message, receiverId, opts = {}) {
    this.body = message.body;
    this.headers = message.headers;
    try {
      const destination = this.headers.destination.split('/');
      [this.senderId, this.channelName] = destination[destination.length - 1].split('.');
    } catch (ex) {
      console.error('Wrong routing key format'); // eslint-disable-line no-console
    }
    this._receiverId = receiverId;
    this._discardMine = opts.discardMine || false;
    this._discardFromApi = opts.discardFromApi || false;
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
}

export default StompMessage;
