'use strict';

var merge = require('merge');
var appRoot = require('app-root-path');
var winston = require('winston');
var SpaceBunnyErrors = require('./spacebunny_errors');
var CONFIG = require(appRoot + '/config/constants').CONFIG;
var request = require('sync-request');

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
* Space Bunny get configurations method
*
*/
SpaceBunny.prototype.connection = function() {
  if(this._apiKey !== undefined && this._connectionParams === undefined)
    this._connectionParams = this.endPointConfigs().connection;
  else if (this._apiKey === undefined && this._connectionParams === undefined)
    throw new SpaceBunnyErrors.ApiKeyOrConfigurationsRequired('Missing configurations');
  return this._connectionParams;
};

/**
* Space Bunny get configurations method
*
*/
SpaceBunny.prototype.endPointConfigs = function() {
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

SpaceBunny.prototype.channels = function () {
  this._channels = this._channels || this._endPointConfigs.channels;
  return this._channels.map(function(obj) {return obj.name});
};

SpaceBunny.prototype.deviceId = function () {
  this._deviceId = this._deviceId || this._connectionParams.username;
  return this._deviceId;
};

module.exports = SpaceBunny;
