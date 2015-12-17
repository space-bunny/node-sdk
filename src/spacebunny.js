/**
 * A module that exports the base SpaceBunny client
 * @module SpaceBunny
 */

// Import some helpers modules
import fs from 'fs';
import merge from 'merge';
import request from 'sync-request';
import humps from 'humps';

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
    this._client = this._connectionParams.client;
    this._secret = this._connectionParams.secret;
    this._host = this._connectionParams.host;
    this._port = this._connectionParams.port;
    this._vhost = this._connectionParams.vhost;
    this._protocol = 'amqp';
    this._inputTopic = this._connectionParams.inputTopic || 'inbox';
    this._ssl = this._connectionParams.ssl || false;
    this._sslOpts = {};
    if (this._connectionParams.cert) { this._sslOpts.cert = fs.readFileSync(this._connectionParams.cert); }
    if (this._connectionParams.key) { this._sslOpts.key = fs.readFileSync(this._connectionParams.key); }
    if (this._connectionParams.passphrase) { this._sslOpts.passphrase = this._connectionParams.passphrase; }
    if (this._connectionParams.ca) { this._sslOpts.ca = [fs.readFileSync(this._connectionParams.ca)];}
    if (this._connectionParams.pfx) { this._sslOpts.pfx = fs.readFileSync(this._connectionParams.pfx); }
    this._sslOpts.secureProtocol = this._connectionParams.secureProtocol || 'TLSv1_method';
  }

  /**
   * Check if api-key or connection parameters have already been passed
   * If at least api-key is passed ask the endpoint for the configurations
   * else if also connection parameters are not passed raise an exception
   *
   * @return an Object containing the connection parameters
   */
  getConnectionParams() {
    // Contact endpoint to retrieve configs
    // Switch endpoint if you are using sdk as device or as access key stream
    let endpoint = '';
    if ((this._deviceId && this._secret) || this._apiKey) { // Device credentials
      endpoint = CONFIG.deviceEndpoint;
      const uri = `${endpoint.url}${endpoint.api_version}${endpoint.path}`;
      if (this._apiKey) {
        // Get configs from endpoint
        try {
          const args = { headers: { 'Api-Key': this._apiKey } };
          const response = request('GET', uri, args);
          this._endPointConfigs = JSON.parse(response.getBody());
          this._connectionParams = humps.camelizeKeys(this._endPointConfigs.connection);
        } catch (ex) {
          throw new SpaceBunnyErrors.EndPointError(ex);
        }
      } else if (this._deviceId && this._secret && this._host && this._port && this._vhost) {
        // Manually provided configs
        this._connectionParams.protocols = {};
        if (this._ssl) {
          this._connectionParams.protocols[this._protocol] = { sslPort: this._port };
        } else {
          this._connectionParams.protocols[this._protocol] = { port: this._port };
        }
      }
    } else if (this._client && this._secret) { // Access key credentials
      if (this._host && this._port && this._vhost) {
        // Manually provided configs
        this._connectionParams.protocols = {};
        if (this._ssl) {
          this._connectionParams.protocols[this._protocol] = { sslPort: this._port };
        } else {
          this._connectionParams.protocols[this._protocol] = { port: this._port };
        }
      } else {
        // Get configs from endpoint
        try {
          endpoint = CONFIG.accessKeyEndpoint;
          const uri = `${endpoint.url}${endpoint.api_version}${endpoint.path}`;
          const args = { headers: { 'Access-Key-Client': this._client, 'Access-Key-Secret': this._secret } };
          const response = request('GET', uri, args);
          this._endPointConfigs = JSON.parse(response.getBody());
          this._connectionParams = humps.camelizeKeys(this._endPointConfigs.connection);
        } catch (ex) {
          throw new SpaceBunnyErrors.EndPointError(ex);
        }
      }
    } else { // No configs or missing some info
      throw new SpaceBunnyErrors.ApiKeyOrConfigurationsRequired('Missing Api Key or wrong connection parameters');
    }
  }

  /**
   * @return all channels configured for the current device
   */
  channels() {
    if (this._channels === undefined) {
      this._channels = this._endPointConfigs.channels.map(function(obj) {
        return obj.name;
      });
    }
    return this._channels || [];
  }

  /**
   * @return the device ID for the current device
   */
  deviceId() {
    this._deviceId = this._deviceId || this._connectionParams.deviceId;
    return this._deviceId;
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * @private
   * Generate the exchange name for a device's channel
   *
   * @param {String} deviceId - Device id from which you want to stream
   * @param {String} channel - channel name from which you want to stream
   * @return a string that represents the complete exchange name
   */
  _channelExchange(deviceId, channel) {
    return `${deviceId}.${channel}`;
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

  _checkSslOptions() {
    const sslOpts = this._sslOpts;
    if (sslOpts.ca) {
      if (sslOpts.cert && sslOpts.key) {
        return true;
      } else if (sslOpts.pfx) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

}

export default SpaceBunny;
