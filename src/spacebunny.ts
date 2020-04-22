/**
 * A module that exports the base SpaceBunny client
 * @module SpaceBunny
 */

// Import some helpers modules
import axios, { AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'events';
import fs from 'fs';
import { camelizeKeys } from 'humps';
import { filter, isEmpty, merge, startsWith } from 'lodash';
import urljoin from 'url-join';
import uuid from 'uuid-v4';

// TODO validate enpointConfig object format with Joi
// import Joi from 'joi';
import CONFIG from './config/constants';

export interface ISpaceBunnyParams {
  endpoint?: any;
  deviceKey?: string;
  channels?: IChannel[];
  deviceId?: string;
  client?: string;
  secret?: string;
  host?: string;
  port?: number;
  vhost?: string;
  protocol?: string;
  inboxTopic?: string;
  cert?: string;
  key?: string;
  passphrase?: string;
  ca?: string;
  pfx?: string;
  disableCertCheck?: boolean;
  secureProtocol?: string;
  tls?: boolean;
  protocols?: { [key: string]: IProtocol };
  autoReconnect?: boolean;
  reconnectTimeout?: number;
  emitLogs?: boolean;
  caching?: boolean;
  cacheSize?: number;
}

export interface IEndpointConfigs {
  connection?: ISpaceBunnyParams;
  liveStreams?: ILiveStream[];
  channels?: IChannel[];
}

export interface ITlsOptions {
  cert?: Buffer;
  key?: Buffer;
  passphrase?: string;
  ca?: Buffer[];
  rejectUnauthorized?: boolean;
  secureProtocol?: string;
  protocol?: string;
  pfx?: Buffer;
}

export interface IProtocol {
  port?: number;
  tlsPort?: number;
}

export interface ILiveStream {
  name: string;
}

export interface IChannel {
  name: string;
}

export interface IEndpoint {
  protocol: string;
  secureProtocol: string;
  host: string;
  port: number;
  securePort: number;
  deviceConfigurationsPath: string;
  liveStreamKeyConfigurationsPath: string;
}

export interface ICachedMessage {
  timestamp: number;
  channel: string;
  message: any;
  opts: any;
  sent?: boolean;
}

/**
 * @constructor
 * @param {Object} opts - constructor options may contain Device-Key or connection options
 */
class SpaceBunny extends EventEmitter {
  protected connectionParams: ISpaceBunnyParams;

  protected endpointConfigs: IEndpointConfigs;

  protected endpoint: any;

  protected deviceKey: string;

  protected channels: IChannel[];

  protected deviceId: string;

  protected client: string;

  protected secret: string;

  protected host: string;

  protected port: number;

  protected vhost: string;

  protected protocol: string;

  protected inboxTopic: string;

  protected liveStreamSuffix: string;

  protected tempQueueSuffix: string;

  protected liveStreams: ILiveStream[];

  protected tls: boolean;

  protected tlsOpts: ITlsOptions;

  protected autoReconnect = true;

  protected reconnectTimeout = 5000;

  protected emitLogs = true;

  protected caching = false;

  private cachedMessages: ICachedMessage[] = [];

  private cacheSize: number;

  private static CACHE_SIZE = 100;

  constructor(opts: ISpaceBunnyParams = {}) {
    super();
    this.connectionParams = camelizeKeys(opts);
    const { endpoint, deviceKey, channels, deviceId, client, secret, host, port, vhost, inboxTopic,
      tls, cert, key, passphrase, ca, pfx, disableCertCheck, secureProtocol, emitLogs, caching, cacheSize } = this.connectionParams;
    this.endpoint = merge(CONFIG.endpoint, endpoint);
    this.deviceKey = deviceKey;
    this.channels = channels;
    this.deviceId = deviceId;
    this.client = client;
    this.secret = secret;
    this.host = host;
    this.port = port;
    this.vhost = vhost;
    this.protocol = CONFIG.protocol;
    this.inboxTopic = inboxTopic || CONFIG.inboxTopic;
    this.liveStreamSuffix = CONFIG.liveStreamSuffix;
    this.tempQueueSuffix = CONFIG.tempQueueSuffix;
    this.liveStreams = [];
    this.tls = (tls === true);
    this.tlsOpts = {};
    if (cert) { this.tlsOpts.cert = fs.readFileSync(cert); }
    if (key) { this.tlsOpts.key = fs.readFileSync(key); }
    if (passphrase) { this.tlsOpts.passphrase = passphrase; }
    if (ca) {
      if (Array.isArray(ca)) {
        this.tlsOpts.ca = ca.map((element) => { return fs.readFileSync(element); });
      } else {
        this.tlsOpts.ca = [fs.readFileSync(ca)];
      }
    }
    if (pfx) { this.tlsOpts.pfx = fs.readFileSync(pfx); }
    if (disableCertCheck) {
      this.tlsOpts.rejectUnauthorized = false;
    } else {
      this.tlsOpts.rejectUnauthorized = true;
    }
    this.tlsOpts.secureProtocol = secureProtocol || CONFIG.tls.secureProtocol;
    this.emitLogs = emitLogs;
    this.caching = caching;
    this.cacheSize = cacheSize || SpaceBunny.CACHE_SIZE;
  }

  /**
   * Check if Device-Key or connection parameters have already been passed
   * If at least Device-Key is passed ask the endpoint for the configurations
   * else if also connection parameters are not passed raise an exception
   *
   * @return an Object containing the connection parameters
   */
  protected getEndpointConfigs = async (): Promise<IEndpointConfigs> => {
    // Resolve with configs if already retrieved
    if (!isEmpty(this.endpointConfigs) || this.isConnected()) {
      return this.endpointConfigs;
    }
    try {
      // Contact endpoint to retrieve configs
      // Switch endpoint if you are using sdk as device or as access key stream
      if ((this.deviceId && this.secret) || this.deviceKey) { // Device credentials
        // uses endpoint passed from user, default endpoint otherwise
        const hostname = this.generateHostname();
        const uri = urljoin(hostname, this.endpoint.deviceConfigurationsPath);
        if (this.deviceKey) { // Get configs from endpoint
          const options: AxiosRequestConfig = {
            url: uri,
            method: 'GET',
            responseType: 'json',
            headers: {
              'Device-Key': this.deviceKey,
              'Content-Type': 'application/json'
            }
          };
          const response = await axios(options);
          this.endpointConfigs = camelizeKeys(response.data);
          this.connectionParams = this.endpointConfigs.connection;
          this.channels = this.endpointConfigs.channels || [];
          return this.endpointConfigs;
        }
        if (this.deviceId && this.secret && this.host && this.port && this.vhost) {
          // Manually provided configs
          this.connectionParams.protocols = {};
          if (this.tls) {
            this.connectionParams.protocols[this.protocol] = { tlsPort: this.port };
          } else {
            this.connectionParams.protocols[this.protocol] = { port: this.port };
          }
          this.endpointConfigs = {
            connection: this.connectionParams,
            channels: [],
          };
          return this.endpointConfigs;
        }
      } else if (this.client && this.secret) { // Access key credentials
        if (this.host && this.port && this.vhost) {
          // Manually provided configs
          this.connectionParams.protocols = {};
          if (this.tls) {
            this.connectionParams.protocols[this.protocol] = { tlsPort: this.port };
          } else {
            this.connectionParams.protocols[this.protocol] = { port: this.port };
          }
          this.endpointConfigs = {
            connection: this.connectionParams,
            liveStreams: [],
          };
          return this.endpointConfigs;
        }
        // Get configs from endpoint
        // uses endpoint passed from user, default endpoint otherwise
        const hostname = this.generateHostname();
        const uri = urljoin(hostname, this.endpoint.liveStreamKeyConfigurationsPath);
        const options = {
          url: uri,
          method: 'get',
          responseType: 'json',
          headers: {
            'Live-Stream-Key-Client': this.client,
            'Live-Stream-Key-Secret': this.secret,
            'Content-Type': 'application/json'
          }
        };
        const response = await axios(options);
        this.endpointConfigs = camelizeKeys(response.data);
        this.connectionParams = this.endpointConfigs.connection;
        this.liveStreams = this.endpointConfigs.liveStreams || [];
        return this.endpointConfigs;
      } else { // No configs or missing some info
        throw new Error('Missing Device Key or wrong connection parameters');
      }
    } catch (error) {
      this.log('error', error);
    }
    return {};
  }

  protected log = (level: string, message: string|Error): void => {
    if (this.emitLogs) {
      this.emit('log', { level, message });
    }
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(message);
    }
  }

  public isConnected = (): boolean => { return false; }

  /**
   * @return all channels configured for the current device
   */
  public getChannels = (): IChannel[] => {
    return this.channels || this.endpointConfigs.channels || [];
  }

  /**
   * @return the device ID for the current device
   */
  public getDeviceId = (): string => {
    return this.deviceId || this.connectionParams.deviceId;
  }

  /**
   * @return the client for the current stream
   */
  public getClient = (): string => {
    return this.client;
  }

  /**
   * @return the Inbox topic for the current device
   */
  public getInboxTopic = (): string => {
    return this.inboxTopic || CONFIG.inboxTopic;
  }

  /**
   * Return a Stream ID from a stream name given in input
   *
   * @param {String} streamName - stream name
   * @return the stream ID which corresponds to the input stream name
   */
  protected liveStreamByName = (streamName: string): string => {
    const liveStreams = filter(this.liveStreams, (stream) => { return stream.name === streamName; });
    if (liveStreams.length > 0) {
      return liveStreams[0].name || streamName;
    }
    return streamName;
  }

  /**
   * Check if a stream exists
   *
   * @param {String} streamName - stream name
   * @return true if stream exists, false otherwise
   */
  protected liveStreamExists = (streamName: string): boolean => {
    if (isEmpty(streamName)) {
      return false;
    }
    const liveStreams = filter(this.liveStreams, (stream) => { return stream.name === streamName; });
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
  protected tempQueue = (prefix: string, suffix: string, currentTime: number|void = undefined): string => {
    const timestamp = currentTime || new Date().getTime();
    const deviceId = this.connectionParams.client || this.connectionParams.deviceId;
    return `${uuid()}-${timestamp}-${deviceId}-`
      + `${this.exchangeName(prefix, suffix)}.`
      + `${this.tempQueueSuffix}`;
  }

  /**
   * Generate the exchange name for a device's channel
   *
   * @private
   * @param {String} prefix - It could be a device id or a stream name
   * @param {String} suffix - It could be a channel name or a the default stream suffix (livestream)
   * @return a string that represents the complete exchange name
   */
  protected exchangeName = (prefix: string, suffix: string): string => {
    return (!isEmpty(prefix) && !isEmpty(suffix)) ? `${this.liveStreamByName(prefix)}.${suffix}` : `${suffix}`;
  }

  public cacheMessage = (channel: string, message: any, opts: any = {}): void => {
    if (this.caching !== true) { return; }
    if (this.cachedMessages.length >= this.cacheSize) {
      // remove eldest message
      this.cachedMessages.shift();
    }
    this.cachedMessages.push({
      timestamp: new Date().getTime(),
      channel,
      message,
      opts,
      sent: false
    });
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * Generate the complete hostname string for an endpoint
   *
   * @private
   * @return the string representing the endpoint url
   */
  private generateHostname = (): string => {
    if (this.endpoint.url) {
      return this.endpoint.url;
    }
    const port = (this.tls) ? this.endpoint.securePort : this.endpoint.port;
    let hostname = `${this.endpoint.host}:${port}`;
    const protocol = (this.tls) ? this.endpoint.secureProtocol : this.endpoint.protocol;
    if (!startsWith(hostname, protocol)) {
      hostname = `${protocol}://${hostname}`;
    }
    return hostname;
  }
}

export default SpaceBunny;
