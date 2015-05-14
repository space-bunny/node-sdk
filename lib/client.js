'use strict';

/**
 * SpaceBunnyClient constructor
 *
 * @param {Object} [options] - connection options
 * @return object containing configurations
 */
function Client (options) {
  return {
    channels: [ 'messages', 'alarms' ]
  }
}

module.exports = Client;
