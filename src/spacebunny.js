/**
 * A module that exports the base SpaceBunny client
 * @module SpaceBunny
 */

// Import some helpers modules
import fs from 'fs';
import merge from 'merge';
import axios from 'axios';
import humps from 'humps';
import Promise from 'bluebird';
import { startsWith, filter } from 'lodash';

const CONFIG = require('../config/constants').CONFIG;

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */
class SpaceBunny {
  constructor(opts = {}) {
    this._connectionParams = merge({}, humps.camelizeKeys(opts));
    this._endpointConfigs = {};
    this._endpointUrl = this._connectionParams.endpointUrl;
    this._apiKey = this._connectionParams.apiKey;
    this._channels = this._connectionParams.channels;
    this._deviceId = this._connectionParams.deviceId;
    this._client = this._connectionParams.client;
    this._secret = this._connectionParams.secret;
    this._host = this._connectionParams.host;
    this._port = this._connectionParams.port;
    this._vhost = this._connectionParams.vhost;
    this._protocol = 'amqp';
    this._inputTopic = this._connectionParams.inputTopic || 'inbox';
    this._liveStreamSuffix = 'live_stream';
    this._liveStreams = [];
    this._ssl = this._connectionParams.ssl || false;
    this._sslOpts = {};
    if (this._connectionParams.cert) { this._sslOpts.cert = fs.readFileSync(this._connectionParams.cert); }
    if (this._connectionParams.key) { this._sslOpts.key = fs.readFileSync(this._connectionParams.key); }
    if (this._connectionParams.passphrase) { this._sslOpts.passphrase = this._connectionParams.passphrase; }
    if (this._connectionParams.ca) { this._sslOpts.ca = [fs.readFileSync(this._connectionParams.ca)];}
    if (this._connectionParams.pfx) { this._sslOpts.pfx = fs.readFileSync(this._connectionParams.pfx); }
    this._sslOpts.secureProtocol = this._connectionParams.secureProtocol || 'TLSv1_method';
  }

  // TODO this function should return a Promise!! Need to be async
  /**
   * Check if api-key or connection parameters have already been passed
   * If at least api-key is passed ask the endpoint for the configurations
   * else if also connection parameters are not passed raise an exception
   *
   * @return an Object containing the connection parameters
   */
  getConnectionParams() {
    return new Promise((resolve, reject) => {
      // Contact endpoint to retrieve configs
      // Switch endpoint if you are using sdk as device or as access key stream
      let endpoint = '';
      if ((this._deviceId && this._secret) || this._apiKey) { // Device credentials
        endpoint = CONFIG.deviceEndpoint;
        // uses endpoint passed from user, default endpoint otherwise
        const hostname = this._generateHostname(endpoint);
        const uri = `${hostname}${endpoint.api_version}${endpoint.path}`;
        if (this._apiKey) {
          // Get configs from endpoint
          const options = { url: uri, method: 'get', headers: { 'Api-Key': this._apiKey }, responseType: 'json' };
          axios(options).then((response) => {
            this._endpointConfigs = humps.camelizeKeys(response.data);
            this._connectionParams = this._endpointConfigs.connection;
            resolve(this._connectionParams);
          }).catch((err) => {
            reject(err);
          });
        } else if (this._deviceId && this._secret && this._host && this._port && this._vhost) {
          // Manually provided configs
          this._connectionParams.protocols = {};
          if (this._ssl) {
            this._connectionParams.protocols[this._protocol] = { sslPort: this._port };
          } else {
            this._connectionParams.protocols[this._protocol] = { port: this._port };
          }
          resolve(this._connectionParams);
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
          resolve(this._connectionParams);
        } else {
          // Get configs from endpoint
          endpoint = CONFIG.accessKeyEndpoint;
          // uses endpoint passed from user, default endpoint otherwise
          const hostname = this._generateHostname(endpoint);
          const uri = `${hostname}${endpoint.api_version}${endpoint.path}`;
          const options = {
            url: uri,
            method: 'get',
            headers: { 'Access-Key-Client': this._client, 'Access-Key-Secret': this._secret },
            responseType: 'json'
          };
          axios(options).then((response) => {
            this._endpointConfigs = humps.camelizeKeys(response.data);
            this._connectionParams = this._endpointConfigs.connection;
            this._liveStreams = this._endpointConfigs.liveStreams || [];
            resolve(this._connectionParams);
          }).catch((err) => {
            reject(err);
          });
        }
      } else { // No configs or missing some info
        reject('Missing Api Key or wrong connection parameters');
      }
    });
  }

  /**
   * @return all channels configured for the current device
   */
  channels() {
    if (this._channels === undefined) {
      this._channels = this._endpointConfigs.channels.map((obj) => {
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

  /**
   * Return a Stream ID from a stream name given in input
   *
   * @param {String} streamName - stream name
   * @return the stream ID which corresponds to the input stream name
   */
  liveStreamByName(streamName) {
    const liveStream = filter(this._liveStreams, (stream) => { return stream.name === streamName; });
    return liveStream[0].id || streamName;
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * Generate the exchange name for a device's channel
   *
   * @private
   * @param {String} deviceId - Device id from which you want to stream
   * @param {String} channel - channel name from which you want to stream
   * @return a string that represents the complete exchange name
   */
  _channelExchange(deviceId, channel) {
    return (deviceId && channel) ? `${deviceId}.${channel}` : `${channel}`;
  }

  /**
   * Encapsulates contens for publishing messages.
   * If the content is a valid JSON the function stringifies the content
   *
   * @private
   * @param {Object} content - content to publish, could be a string or a JSON object
   * @return the content encapsulated in the proper way
   */
  _encapsulateContent(content) {
    let encapsulatedContent = content;
    try {
      encapsulatedContent = JSON.stringify(content);
    } catch (ex) {
      encapsulatedContent = content;
    }
    return encapsulatedContent;
  }

  /**
   * Check if the required parameters are present to open a secure connection
   *
   * @private
   * @return true when a combination of valid parameters is present, false otherwise
   */
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

  _generateHostname(endpoint) {
    let hostname = `${(this._endpointUrl || endpoint.url)}`;
    const endpointProtocol = (this._ssl) ? CONFIG.secureProtocol : CONFIG.protocol;
    if (!startsWith(hostname, endpointProtocol)) {
      hostname = `${endpointProtocol}://${hostname}`;
    }
    return hostname;
  }

}

export default SpaceBunny;
