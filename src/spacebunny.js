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

// TODO validate enpointConfig object format with Joi
// import Joi from 'joi';

const CONFIG = require('../config/constants').CONFIG;

/**
 * @constructor
 * @param {Object} opts - constructor options may contain Device-Key or connection options
 */
class SpaceBunny {
  constructor(opts = {}) {
    this._connectionParams = merge({}, humps.camelizeKeys(opts));
    this._endpointConfigs = undefined;
    this._endpointUrl = this._connectionParams.endpointUrl;
    this._deviceKey = this._connectionParams.deviceKey;
    this._channels = this._connectionParams.channels;
    this._deviceId = this._connectionParams.deviceId;
    this._client = this._connectionParams.client;
    this._secret = this._connectionParams.secret;
    this._host = this._connectionParams.host;
    this._port = this._connectionParams.port;
    this._vhost = this._connectionParams.vhost;
    this._protocol = CONFIG.protocol;
    this._inboxTopic = this._connectionParams.inputTopic || CONFIG.inboxTopic;
    this._liveStreamSuffix = CONFIG.liveStreamSuffix;
    this._tempQueueSuffix = CONFIG.tempQueueSuffix;
    this._liveStreams = [];
    this._ssl = this._connectionParams.ssl || false;
    this._sslOpts = {};
    if (this._connectionParams.cert) { this._sslOpts.cert = fs.readFileSync(this._connectionParams.cert); }
    if (this._connectionParams.key) { this._sslOpts.key = fs.readFileSync(this._connectionParams.key); }
    if (this._connectionParams.passphrase) { this._sslOpts.passphrase = this._connectionParams.passphrase; }
    if (this._connectionParams.ca) {
      if (Array.isArray(this._connectionParams.ca)) {
        this._sslOpts.ca = this._connectionParams.ca.map((element) => {
          return fs.readFileSync(element);
        });
      } else {
        this._sslOpts.ca = [fs.readFileSync(this._connectionParams.ca)];
      }
    }
    if (this._connectionParams.pfx) { this._sslOpts.pfx = fs.readFileSync(this._connectionParams.pfx); }
    if (this._connectionParams.disableCertCheck) {
      this._sslOpts.rejectUnauthorized = false;
    } else {
      this._sslOpts.rejectUnauthorized = true;
    }
    this._sslOpts.secureProtocol = this._connectionParams.secureProtocol || CONFIG.ssl.secureProtocol;
  }

  // TODO this function should return a Promise!! Need to be async
  /**
   * Check if Device-Key or connection parameters have already been passed
   * If at least Device-Key is passed ask the endpoint for the configurations
   * else if also connection parameters are not passed raise an exception
   *
   * @return an Object containing the connection parameters
   */
  getEndpointConfigs() {
    return new Promise((resolve, reject) => {
      // Resolve with configs if already retrieved
      if (this._endpointConfigs !== undefined) {
        resolve(this._endpointConfigs);
      }
      // Contact endpoint to retrieve configs
      // Switch endpoint if you are using sdk as device or as access key stream
      let endpoint = '';
      if ((this._deviceId && this._secret) || this._deviceKey) { // Device credentials
        endpoint = CONFIG.deviceEndpoint;
        // uses endpoint passed from user, default endpoint otherwise
        const hostname = this._generateHostname(endpoint);
        const uri = `${hostname}${endpoint.api_version}${endpoint.path}`;
        if (this._deviceKey) { // Get configs from endpoint
          const options = {
            url: uri,
            method: 'get',
            responseType: 'json',
            headers: {
              'Device-Key': this._deviceKey,
              'Content-Type': 'application/json'
            }
          };
          axios(options).then((response) => {
            this._endpointConfigs = humps.camelizeKeys(response.data);
            this._connectionParams = this._endpointConfigs.connection;
            resolve(this._endpointConfigs);
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
          this._endpointConfigs = {
            connection: this._connectionParams,
            channels: []
          };
          resolve(this._endpointConfigs);
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
          this._endpointConfigs = {
            connection: this._connectionParams,
            liveStreams: []
          };
          resolve(this._endpointConfigs);
        } else {
          // Get configs from endpoint
          endpoint = CONFIG.accessKeyEndpoint;
          // uses endpoint passed from user, default endpoint otherwise
          const hostname = this._generateHostname(endpoint);
          const uri = `${hostname}${endpoint.api_version}${endpoint.path}`;
          const options = {
            url: uri,
            method: 'get',
            responseType: 'json',
            headers: {
              'Live-Stream-Key-Client': this._client,
              'Live-Stream-Key-Secret': this._secret,
              'Content-Type': 'application/json'
            }
          };
          axios(options).then((response) => {
            this._endpointConfigs = humps.camelizeKeys(response.data);
            this._connectionParams = this._endpointConfigs.connection;
            this._liveStreams = this._endpointConfigs.liveStreams || [];
            resolve(this._endpointConfigs);
          }).catch((err) => {
            reject(err);
          });
        }
      } else { // No configs or missing some info
        reject('Missing Device Key or wrong connection parameters');
      }
    });
  }

  /**
   * @return all channels configured for the current device
   */
  channels() {
    this.getEndpointConfigs().then((endpointConfigs) => {
      this._channels = endpointConfigs.channels.map((obj) => {
        return obj.name;
      });
      return this._channels || [];
    });
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
    const liveStreams = filter(this._liveStreams, (stream) => { return stream.name === streamName; });
    if (liveStreams.length > 0) {
      return liveStreams[0].id || streamName;
    } else {
      return streamName;
    }
  }

  /**
   * Check if a stream exists
   *
   * @param {String} streamName - stream name
   * @return true if stream exists, false otherwise
   */
  liveStreamExists(streamName) {
    const liveStreams = filter(this._liveStreams, (stream) => { return stream.name === streamName; });
    return (liveStreams.length > 0);
  }

  /**
   * Generate a temporary queue name
   *
   * @private
   * @param {String} prefix - client id or stream name
   * @param {String} suffix - channel name or defaul live stream suffix
   * @param {Numeric} currentTime - current timestamp
   * @return a string that represents the topic name for that channel
   */
  tempQueue(prefix, suffix, currentTime) {
    const timestamp = currentTime || new Date().getTime();
    return `${timestamp}-${this._connectionParams.client}-` +
      `${this.exchangeName(prefix, suffix)}.` +
      `${this._tempQueueSuffix}`;
  }

  /**
   * Generate the exchange name for a device's channel
   *
   * @private
   * @param {String} prefix - It could be a device id or a stream name
   * @param {String} suffix - It could be a channel name or a the default stream suffix (live_stream)
   * @return a string that represents the complete exchange name
   */
  exchangeName(prefix, suffix) {
    return (prefix && suffix) ? `${this.liveStreamByName(prefix)}.${suffix}` : `${suffix}`;
  }

  // ------------ PRIVATE METHODS -------------------

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
   * Generate the complete hostname string for an endpoint
   *
   * @private
   * @return the string representing the endpoint url
   */
  _generateHostname(endpoint) {
    let hostname = `${(this._endpointUrl || endpoint.url)}`;
    // const endpointProtocol = (this._ssl) ? CONFIG.endpoint.secureProtocol : CONFIG.endpoint.protocol;
    const endpointProtocol = CONFIG.endpoint.protocol;
    if (!startsWith(hostname, endpointProtocol)) {
      hostname = `${endpointProtocol}://${hostname}`;
    }
    return hostname;
  }

  /**
   * Automatically parse message content
   *
   * @private
   * @param {Object/String} message - the received message
   * @return an object containing the input message with parsed content
   */
  _parseContent(message) {
    let parsedMessage = message;
    if (Buffer.isBuffer(parsedMessage)) {
      const content = parsedMessage.toString('utf-8');
      try {
        parsedMessage = JSON.parse(content);
      } catch (ex) {
        parsedMessage = content;
      }
    }
    return parsedMessage;
  }

}

export default SpaceBunny;
