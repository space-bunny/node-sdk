/**
 * A module that exports the base SpaceBunny client
 * @module SpaceBunny
 */

// Import some helpers modules
import fs from 'fs';
import axios from 'axios';
import humps from 'humps';
import Promise from 'bluebird';
import _ from 'lodash';
import urljoin from 'url-join';
import EventEmitter from 'events';
import uuid from 'uuid-v4';

// TODO validate enpointConfig object format with Joi
// import Joi from 'joi';

import CONFIG from '../config/constants';

/**
 * @constructor
 * @param {Object} opts - constructor options may contain Device-Key or connection options
 */
class SpaceBunny extends EventEmitter {

  _connectionParams: any;
  _endpointConfigs: any;
  _endpoint: any;
  _deviceKey: string;
  _channels: any;
  _deviceId: string;
  _client: string;
  _secret: string;
  _host: string;
  _port: number;
  _vhost: string;
  _protocol: string;
  _inboxTopic: string;
  _liveStreamSuffix: string;
  _tempQueueSuffix: string;
  _liveStreams: any;
  _tls: boolean;
  _tlsOpts: any;

  constructor(opts: any = {}) {
    super();
    this._connectionParams = _.merge({}, humps.camelizeKeys(opts));
    this._endpointConfigs = undefined;
    this._endpoint = _.merge(CONFIG.endpoint, this._connectionParams.endpoint);
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
    this._tls = this._connectionParams.tls || false;
    this._tlsOpts = {};
    if (this._connectionParams.cert) { this._tlsOpts.cert = fs.readFileSync(this._connectionParams.cert); }
    if (this._connectionParams.key) { this._tlsOpts.key = fs.readFileSync(this._connectionParams.key); }
    if (this._connectionParams.passphrase) { this._tlsOpts.passphrase = this._connectionParams.passphrase; }
    if (this._connectionParams.ca) {
      if (Array.isArray(this._connectionParams.ca)) {
        this._tlsOpts.ca = this._connectionParams.ca.map((element) => {
          return fs.readFileSync(element);
        });
      } else {
        this._tlsOpts.ca = [fs.readFileSync(this._connectionParams.ca)];
      }
    }
    if (this._connectionParams.pfx) { this._tlsOpts.pfx = fs.readFileSync(this._connectionParams.pfx); }
    if (this._connectionParams.disableCertCheck) {
      this._tlsOpts.rejectUnauthorized = false;
    } else {
      this._tlsOpts.rejectUnauthorized = true;
    }
    this._tlsOpts.secureProtocol = this._connectionParams.secureProtocol || CONFIG.tls.secureProtocol;
  }

  /**
   * Check if Device-Key or connection parameters have already been passed
   * If at least Device-Key is passed ask the endpoint for the configurations
   * else if also connection parameters are not passed raise an exception
   *
   * @return an Object containing the connection parameters
   */
  getEndpointConfigs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      // Resolve with configs if already retrieved
      if (this._endpointConfigs !== undefined || this.isConnected()) {
        resolve(this._endpointConfigs);
        return undefined;
      }
      // Contact endpoint to retrieve configs
      // Switch endpoint if you are using sdk as device or as access key stream
      if ((this._deviceId && this._secret) || this._deviceKey) { // Device credentials
        // uses endpoint passed from user, default endpoint otherwise
        const hostname = this._generateHostname();
        const uri = urljoin(hostname, this._endpoint.deviceConfigurationsPath);
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
          if (this._tls) {
            this._connectionParams.protocols[this._protocol] = { tlsPort: this._port };
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
          if (this._tls) {
            this._connectionParams.protocols[this._protocol] = { tlsPort: this._port };
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
          // uses endpoint passed from user, default endpoint otherwise
          const hostname = this._generateHostname();
          const uri = urljoin(hostname, this._endpoint.liveStreamKeyConfigurationsPath);
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
        reject(new Error('Missing Device Key or wrong connection parameters'));
      }
      return undefined;
    });
  }

  isConnected = (): boolean => { return false; }

  /**
   * @return all channels configured for the current device
   */
  channels = () => {
    if (this._endpointConfigs.channels) {
      this._channels = this._endpointConfigs.channels.map((obj) => {
        return obj.name;
      });
      return this._channels || [];
    } else {
      return [];
    }
  }

  /**
   * @return the device ID for the current device
   */
  deviceId = () => {
    this._deviceId = this._deviceId || this._connectionParams.deviceId;
    return this._deviceId;
  }

  /**
   * Return a Stream ID from a stream name given in input
   *
   * @param {String} streamName - stream name
   * @return the stream ID which corresponds to the input stream name
   */
  liveStreamByName = (streamName: string) => {
    const liveStreams = _.filter(this._liveStreams, (stream) => { return stream.name === streamName; });
    if (liveStreams.length > 0) {
      return liveStreams[0].name || streamName;
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
  liveStreamExists = (streamName: string = '') => {
    if (_.isEmpty(streamName)) {
      return false;
    }
    const liveStreams = _.filter(this._liveStreams, (stream) => { return stream.name === streamName; });
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
  tempQueue = (prefix: string = '', suffix: string = '', currentTime: number|void = undefined) => {
    const timestamp = currentTime || new Date().getTime();
    const deviceId = this._connectionParams.client || this._connectionParams.deviceId;
    return `${uuid()}-${timestamp}-${deviceId}-`
      + `${this.exchangeName(prefix, suffix)}.`
      + `${this._tempQueueSuffix}`;
  }

  /**
   * Generate the exchange name for a device's channel
   *
   * @private
   * @param {String} prefix - It could be a device id or a stream name
   * @param {String} suffix - It could be a channel name or a the default stream suffix (live_stream)
   * @return a string that represents the complete exchange name
   */
  exchangeName = (prefix: string = '', suffix: string = '') => {
    return (!_.isEmpty(prefix) && !_.isEmpty(suffix)) ? `${this.liveStreamByName(prefix)}.${suffix}` : `${suffix}`;
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * Generate the complete hostname string for an endpoint
   *
   * @private
   * @return the string representing the endpoint url
   */
  _generateHostname = () => {
    if (this._endpoint.url) {
      return this._endpoint.url;
    }
    const port = (this._tls) ? this._endpoint.securePort : this._endpoint.port;
    let hostname = `${this._endpoint.host}:${port}`;
    const protocol = (this._tls) ? this._endpoint.secureProtocol : this._endpoint.protocol;
    if (!_.startsWith(hostname, protocol)) {
      hostname = `${protocol}://${hostname}`;
    }
    return hostname;
  }
}

export default SpaceBunny;
