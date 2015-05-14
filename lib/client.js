'use strict';

var Client = function () {
  var _configurations = {};
};

/**
* SpaceBunnyClient constructor
*
* @param {Object} [options] - connection options
* @return object containing configurations
*/
Client.prototype.authenticate = function (options) {
  this._configurations = {
    channels: [ 'messages', 'alarms' ]
  };
  return this._configurations;
};

module.exports = new Client();
