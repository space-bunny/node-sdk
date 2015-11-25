/**
 * A module that exports the base SpaceBunny client
 * @module SpaceBunny
 */

// Import some helpers modules
import merge from 'merge';
import request from 'sync-request';

const CONFIG = require('../config/constants').CONFIG;

// Import Space Bunny errors
import SpaceBunnyErrors from './spacebunny_errors';

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */
class SpaceBunny {
  constructor(opts) {
    this._opts = merge({}, opts);
    this._connectionParams = this._opts.connection;
    this._apiKey = this._opts.apiKey;
    this._endPoint = this._opts.endPoint;
    this._channels = this._opts.channels;
    this._endPointConfigs = this._opts.endPointConfigs;
    this._deviceId = this._opts.deviceId;
    this._inputTopic = 'inbox';
  }

  /**
   * Check if api-key or connection parameters have already been passed
   * If at least api-key is passed ask the endpoint for the configurations
   * else if also connection parameters are not passed raise an exception
   *
   * @return an Object containing the connection parameters
   */
  connection() {
    if (this._apiKey !== undefined && this._connectionParams === undefined) {
      this._connectionParams = this._endPointConfigurations().connection;
    } else if (this._apiKey === undefined && this._connectionParams === undefined) {
      throw new SpaceBunnyErrors.ApiKeyOrConfigurationsRequired('Missing configurations');
    }
    return this._connectionParams;
  }

  /**
   * @return all channels configured for the current device
   */
  channels() {
    this._channels = this._endPointConfigs.channels || this._channels;
    return this._channels.map(function(obj) {
      return obj.name;
    });
  }

  /**
   * @return the device ID for the current device
   */
  deviceId() {
    this._deviceId = this._deviceId || this._connectionParams.device_id;
    return this._deviceId;
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * @private
   * Return configs from the Space Bunny ndpoint
   * it caches configurations so if you ask multiple
   * time for configurations it makes only one request
   *
   * @return an Object containing endpoint configurations
   */
  _endPointConfigurations() {
    if (this._endPointConfigs !== undefined) {
      return this._endPointConfigs;
    }

    // Contact endpoint to retrieve configs
    const uri = `${CONFIG.endpoint.url}${CONFIG.endpoint.api_version}${CONFIG.endpoint.path}`;
    try {
      const args = { headers: { 'Api-Key': this._apiKey } };
      const response = request('GET', uri, args);
      this._endPointConfigs = JSON.parse(response.getBody());
      return this._endPointConfigs;
    } catch (ex) {
      throw new SpaceBunnyErrors.EndPointError(ex);
    }
  }

  _encapsulateContent(content) {
    let encapsulatedContent = content;
    try {
      encapsulatedContent = JSON.stringify(content);
    } catch (ex) {
      encapsulatedContent = content;
    }
    return encapsulatedContent;
  }

}

export default SpaceBunny;
