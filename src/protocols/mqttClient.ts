/**
 * A module that exports an MqttClient client
 * which inherits from the SpaceBunny base client
 * @module MqttClient
 */

import mqtt, {
  AsyncMqttClient, IClientOptions, IClientPublishOptions, IClientSubscribeOptions, QoS
} from 'async-mqtt';
import fs from 'fs';
import { isNullOrUndefined, promisify } from 'util';

// import { promisify } from 'util';
import SpaceBunny, { ISpaceBunnyParams } from '../spacebunny';
import { encapsulateContent } from '../utils';

export type IMqttCallback = (topic?: string, message?: any) => Promise<void> | void;
export type IMqttListener = {
  callback: IMqttCallback;
  topics?: string[];
}

export type IMqttConnectionOptions = {
  qos?: QoS;
  clean?: boolean;
  reconnectPeriod?: number;
  keepalive?: number;
  connectTimeout?: number;
}

class MqttClient extends SpaceBunny {
  protected mqttClient: AsyncMqttClient;

  protected mqttListeners: { [name: string]: IMqttListener } = {};

  protected topics: string[] = [];

  protected connectionOpts: IMqttConnectionOptions;

  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts: ISpaceBunnyParams = {}) {
    super(opts);
    this.topics = [];
    this.mqttClient = undefined;
    this.protocol = 'mqtt';
    this.tlsProtocol = 'mqtts';
    this.connectionOpts = { qos: 1, clean: true };
    const { cert, key, passphrase, ca, pfx, disableCertCheck } = opts;
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
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is received
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  public onMessage = async (callback: IMqttCallback, opts: IClientSubscribeOptions = { qos: 1 }): Promise<string|void> => {
    // subscribe for inbox messages
    const topic = this.topicFor(null, this.inboxTopic);
    this.addMqttListener(topic, callback, topic);
    await this.subscribe(topic, opts);
  }

  /**
   * Publish a message on a specific channel
   *
   * @param {String} channel - channel name on which you want to publish a message
   * @param {Object/String} message - the message payload
   * @param {Object} opts - publication options
   * @return a promise containing the result of the operation
   */
  public publish = async (channel: string, message: any, opts: IClientPublishOptions = { qos: 1 }): Promise<any> => {
    // Publish message
    if (this.isConnected()) {
      const topic = this.topicFor(null, channel);
      try {
        const bufferedMessage = Buffer.from(encapsulateContent(message));
        await this.mqttClient.publish(topic, bufferedMessage, opts);
        this.log('silly', `Published message on topic ${topic}`);
      } catch (error) {
        this.log('error', `Error publishing on topic ${topic}`);
        throw error;
      }
    } else {
      throw new Error(`${this.getClassName()} - Error sending message on channel ${channel} when client is not connected.`);
    }
  }

  /**
   * Destroy the connection between the mqtt client and broker
   *
   * @return a promise containing the result of the operation
   */
  public async disconnect(): Promise<boolean> {
    if (this.isConnected()) {
      try {
        await this.unsubscribe();
        await this.mqttClient.end();
      } catch (error) {
        this.log('error', 'Error disconnecting client.');
        throw error;
      }
    }
    this.mqttClient = undefined;
    this.mqttListeners = {};
    this.topics = [];
    this.emit('disconnected');
    this.log('info', 'disconnected');
    return true;
  }

  /**
   * Establish an mqtt connection with the broker.
   * If a connection already exists, returns the current connection
   *
   * @param {Object} opts - connection options
   * @return a promise containing current connection
   */
  public connect = async (opts: IClientOptions = {}): Promise<AsyncMqttClient|void> => {
    if (this.isConnected()) { return this.mqttClient; }
    await this.getEndpointConfigs();
    try {
      const clientId = this.connectionParams.deviceId || this.connectionParams.client;
      let mqttConnectionParams: IClientOptions = {
        host: this.connectionParams.host,
        protocol: (this.tls) ? 'mqtts' : 'mqtt',
        port: (this.tls) ? this.connectionParams.protocols.mqtt.tlsPort : this.connectionParams.protocols.mqtt.port,
        username: `${this.connectionParams.vhost}:${clientId}`,
        password: this.connectionParams.secret,
        // Client id is used for resource authorization, multiple clients with the same clientId are not allowed
        clientId,
        connectTimeout: opts.connectTimeout || this.connectionTimeout,
        reconnectPeriod: (this.autoReconnect) ? (opts.reconnectPeriod || this.reconnectTimeout) : 0, // disable autoreconnect ??
        clean: (isNullOrUndefined(opts.clean)) ? true : opts.clean,
        keepalive: opts.keepalive || this.heartbeat,
        // ...opts
      };
      if (this.tls) { mqttConnectionParams = { ...mqttConnectionParams, ...this.tlsOpts }; }
      this.mqttClient = await mqtt.connectAsync(null, mqttConnectionParams, this.autoReconnect);
      const onError = (err: Error) => {
        if (err) {
          this.emit('error', err);
          this.log('error', err);
        }
        this.mqttClient.removeAllListeners();
        this.mqttClient = undefined;
        // Already done by mqttjs??
        // if (this.autoReconnect) {
        //   this.connect(opts);
        // }
      };
      this.mqttClient.on('error', onError);
      this.mqttClient.on('close', onError);
      this.mqttClient.on('message', (msgTopic: string, message: Buffer) => {
        try {
          let msg: any = {};
          try {
            msg = JSON.parse(message.toString());
          } catch (e) {
            msg = message.toString();
          }
          Object.entries(this.mqttListeners).forEach(([, listener]) => {
            const { callback, topics } = listener;
            if (topics.length === 0 || topics.includes(msgTopic)) {
              this.log('debug', `Received message for topic ${msgTopic}`, msg);
              callback(msgTopic, msg);
            } else {
              this.log('silly', `Received unlistened message for topic ${msgTopic}`, msg);
            }
          });
        } catch (error) {
          this.log('error', 'Error consuming message');
          this.log('error', error);
        }
      });
      this.emit('connect');
      this.log('debug', 'Client connected!');
      return this.mqttClient;
    } catch (error) {
      if (!isNullOrUndefined(this.mqttClient)) {
        this.mqttClient.removeAllListeners();
        this.mqttClient = undefined;
      }
      this.log('error', 'Error during connection');
      if (this.autoReconnect) {
        this.log('error', error.message);
        const timeout = promisify(setTimeout);
        await timeout(this.reconnectTimeout);
        this.connect(opts);
      } else {
        throw error;
      }
    }
  }

  isConnected = () => {
    return (!isNullOrUndefined(this.mqttClient) && this.mqttClient.connected);
  }

  // ------------ PROTECTED METHODS -------------------

  protected addMqttListener = (name: string, callback: IMqttCallback, topics?: string | string[]): void => {
    this.mqttListeners[name] = { callback, topics: Array.isArray(topics) ? topics : [topics] };
  }

  protected removeMqttListener = (name: string): void => {
    delete this.mqttListeners[name];
  }

  protected subscribe = async (topics: string | string[], opts: IClientSubscribeOptions = { qos: 1 }): Promise<void> => {
    if (this.isConnected()) {
      const topicsToSubscribe = (Array.isArray(topics)) ? topics : [topics];
      await this.mqttClient.subscribe(topicsToSubscribe, opts);
      this.topics.push(...topicsToSubscribe);
      this.log('info', `Client subscribed to topics: ${topicsToSubscribe.join(',')}`);
    } else {
      throw new Error(`${this.getClassName()} - Trying to subscribe when client is not connected`);
    }
  }

  /**
   * Unsubscribe client from a list of topics
   *
   * @param {Object} topics - list of topics { topic: qos, ... }
   * e.g. { topic_1: 1, topic_2: 0 }
   * @return a promise containing the result of the operation
   */
  protected async unsubscribe(topics: string | string[] = []): Promise<void> {
    let topicsToUnsubscribe = (this.topics.length > 0 && topics.length === 0) ? this.topics : topics;
    topicsToUnsubscribe = (Array.isArray(topicsToUnsubscribe)) ? topicsToUnsubscribe : [topicsToUnsubscribe];
    if (this.isConnected()) {
      if (topicsToUnsubscribe.length > 0) {
        await this.mqttClient.unsubscribe(topicsToUnsubscribe);
      }
      for (let index = 0; index < topicsToUnsubscribe.length; index += 1) {
        const topic = topicsToUnsubscribe[index];
        for (let idx = 0; idx < this.topics.length; idx += 1) {
          if (this.topics[idx] === topic) { this.topics.splice(idx, 1); }
        }
      }
      this.log('info', `Client unsubscribed from topics: ${topicsToUnsubscribe.join(',')}`);
    } else {
      throw new Error(`${this.getClassName()} - Error trying to unsucscribe from ${topicsToUnsubscribe.join(',')} on an invalid connection`);
    }
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * Generate the topic for a specific channel
   *
   * @private
   * @param {String} deviceId - device id
   * @param {String} channel - channel name on which you want to publish a message
   * @return a string that represents the topic name for that channel
   */
  private topicFor = (deviceId: string|void|null, channel: string) => {
    return `${deviceId || this.getDeviceId()}/${channel}`;
  }
}

export default MqttClient;
