/**
 * A module that exports the base SpaceBunny client
 * @module SpaceBunny
 */

'use strict';

// Import some helpers modules
var merge = require('merge');
var appRoot = require('app-root-path');
var winston = require('winston');
var CONFIG = require(appRoot + '/config/constants').CONFIG;
var request = require('sync-request');

// Import Space Bunny errors
var SpaceBunnyErrors = require('./spacebunny_errors');

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */
var SpaceBunny = function (opts) {
  this._opts = merge({},opts);
  this._connectionParams = this._opts.connection;
  this._apiKey = this._opts.apiKey;
  this._endPoint = this._opts.endPoint;
  this._channels = this._opts.channels || [];
  this._endPointConfigs = this._opts.endPointConfigs;
  this._deviceId = this._opts.deviceId;
};

/**
 * Check if api-key or connection parameters have already been passed
 * If at least api-key is passed ask the endpoint for the configurations
 * else if also connection parameters are not passed raise an exception
 *
 * @return an Object containing the connection parameters
 */
SpaceBunny.prototype.connection = function() {
  if(this._apiKey !== undefined && this._connectionParams === undefined)
    this._connectionParams = this._endPointConfigurations().connection;
  else if (this._apiKey === undefined && this._connectionParams === undefined)
    throw new SpaceBunnyErrors.ApiKeyOrConfigurationsRequired('Missing configurations');
  return this._connectionParams;
};

/**
 * @return all channels configured for the current device
 */
SpaceBunny.prototype.channels = function () {
  this._channels = this._channels || this._endPointConfigs.channels;
  return this._channels.map(function(obj) {return obj.name});
};

/**
 * @return the device ID for the current device
 */
SpaceBunny.prototype.deviceId = function () {
  this._deviceId = this._deviceId || this._connectionParams.username;
  return this._deviceId;
};

// ------------ PRIVATE METHODS -------------------

/**
 * @private
 * Return configs from the Space Bunny ndpoint
 * it caches configurations so if you ask multiple
 * time for configurations it makes only one request
 *
 * @return an Object containing endpoint configurations
 */
SpaceBunny.prototype._endPointConfigurations = function() {
  if(this._endPointConfigs !== undefined)
    return this._endPointConfigs;

  // Contact endpoint to retrieve configs
  var uri = "http://".concat(CONFIG.endpoint.url, CONFIG.endpoint.api_version, CONFIG.endpoint.path);
  var response;
  try {
    var args = { headers: { 'Api-Key': this._apiKey } };
    var response = request('GET', uri, args);
    this._endPointConfigs = JSON.parse(response.getBody());
    return this._endPointConfigs;
  } catch(e) {
    throw new SpaceBunnyErrors.EndPointError(e);
  }
};

module.exports = SpaceBunny;
