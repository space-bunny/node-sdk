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
    this._connectionParams = merge({}, opts);
    this._endPointConfigs = {};
    this._channels = this._connectionParams.channels;
    this._apiKey = this._connectionParams.apiKey;
    this._deviceId = this._connectionParams.deviceId;
    this._secret = this._connectionParams.secret;
    this._host = this._connectionParams.host;
    this._port = this._connectionParams.port;
    this._vhost = this._connectionParams.vhost;
    this._protocol = 'amqp';
    this._ssl = this._connectionParams.ssl || false;
    this._inputTopic = this._connectionParams.inputTopic || 'inbox';
  }

  /**
   * Check if api-key or connection parameters have already been passed
   * If at least api-key is passed ask the endpoint for the configurations
   * else if also connection parameters are not passed raise an exception
   *
   * @return an Object containing the connection parameters
   */
  connection() {
    // Contact endpoint to retrieve configs
    const uri = `${CONFIG.endpoint.url}${CONFIG.endpoint.api_version}${CONFIG.endpoint.path}`;
    if (this._apiKey) {
      // Get configs from endpoint
      try {
        const args = { headers: { 'Api-Key': this._apiKey } };
        const response = request('GET', uri, args);
        this._endPointConfigs = JSON.parse(response.getBody());
        this._connectionParams = this._endPointConfigs.connection;
        this._connectionParams.deviceId = this._connectionParams.device_id;
      } catch (ex) {
        throw new SpaceBunnyErrors.EndPointError(ex);
      }
    } else if (this._deviceId && this._secret && this._host && this._port && this._vhost) {
      // Manually provided configs
      this._connectionParams.protocols = {};
      if (this._ssl) {
        this._connectionParams.protocols[this._protocol] = { ssl_port: this._port };
      } else {
        this._connectionParams.protocols[this._protocol] = { port: this._port };
      }
    } else { // No configs or missing some info
      throw new SpaceBunnyErrors.ApiKeyOrConfigurationsRequired('Missing Api Key or wrong connection parameters');
    }
  }

  /**
   * @return all channels configured for the current device
   */
  channels() {
    this._channels = this._endPointConfigs.channels || this._channels || [];
    return this._channels.map(function(obj) {
      return obj.name;
    });
  }

  /**
   * @return the device ID for the current device
   */
  deviceId() {
    this._deviceId = this._deviceId || this._connectionParams.deviceId;
    return this._deviceId;
  }

  // ------------ PRIVATE METHODS -------------------

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
