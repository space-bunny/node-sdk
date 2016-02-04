/**
 * A module that exports the base SpaceBunny client
 * @module SpaceBunny
 */

const CONFIG = require('../config/constants').CONFIG;

/**
 * @constructor
 * @param {Object} message - constructor options may contain api-key or connection options
 * @param {Object} opts - constructor options may contain api-key or connection options
 */
class Message {
  constructor(message, deviceId, opts = {}) {
    this.content = message.content;
    this.fields = message.fields;
    this.properties = message.properties;
    [this.senderId, this.channelName] = this.fields.routingKey.split('.');
    this._deviceId = deviceId;
    this._discardMine = opts.discardMine || false;
    this._discardFromApi = opts.discardFromApi || false;
  }

  blackListed() {
    if (this._discardMine && this._deviceId === this.senderId && !this.fromApi()) return true;
    if (this._discardFromApi && this.fromApi()) return true;
    return false;
  }

  fromApi() {
    return (this.fields.exchange === CONFIG.apiExchange);
  }
}

export default Message;
