/**
 * A module that exports an MqttClient client
 * which inherits from the SpaceBunny base client
 * @module MqttClient
 */

import mqtt, {
  AsyncMqttClient, IClientOptions, IClientPublishOptions, IClientSubscribeOptions, QoS
} from 'async-mqtt';
import fs from 'fs';
import { isEmpty, isNil, without } from 'lodash';

// import { promisify } from 'util';
import SpaceBunny, { ISpaceBunnyParams } from '../spacebunny';
import { encapsulateContent } from '../utils';

export type IMqttCallback = (topic?: string, message?: any) => Promise<void>;
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
    this.connectionOpts = { qos: 2, clean: true };
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
  public onReceive = async (callback: IMqttCallback, opts: IClientSubscribeOptions = { qos: 2 }): Promise<string|void> => {
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
  public publish = async (channel: string, message: any, opts: IClientPublishOptions = { qos: 2 }): Promise<any> => {
    // Publish message
    if (this.isConnected()) {
      const topic = this.topicFor(null, channel);
      const bufferedMessage = Buffer.from(encapsulateContent(message));
      await this.mqttClient.publish(topic, bufferedMessage, opts);
    } else {
      throw new Error(`MqttClient: sending message on channel ${channel} when client is not connected`);
    }
  }

  public addMqttListener = (name: string, callback: IMqttCallback, topics?: string | string[]): void => {
    this.mqttListeners[name] = { callback, topics: Array.isArray(topics) ? topics : [topics] };
  }

  public removeMqttListener = (name: string): void => {
    delete this.mqttListeners[name];
  }

  public subscribe = async (topics: string | string[], opts: IClientSubscribeOptions = { qos: 2 }): Promise<void> => {
    if (this.isConnected()) {
      await this.mqttClient.subscribe(topics, opts);
      this.topics.push(...topics);
      this.log('info', `Client subscribed to topics: ${(Array.isArray(topics)) ? topics.join(',') : topics}`);
    }
  }

  /**
   * Unsubscribe client from a list of topics
   *
   * @param {Object} topics - list of topics { topic: qos, ... }
   * e.g. { topic_1: 1, topic_2: 0 }
   * @return a promise containing the result of the operation
   */
  public async unsubscribe(topics?: string | string[]): Promise<void> {
    if (this.isConnected()) {
      let topicsToUnsubscribe = [];
      if (topics) {
        await this.mqttClient.unsubscribe(topics);
        this.topics = without(this.topics, ...(Array.isArray(topicsToUnsubscribe) ? topicsToUnsubscribe : [topicsToUnsubscribe]));
      } else {
        topicsToUnsubscribe = this.topics;
        if (Object.keys(this.topics).length > 0) await this.mqttClient.unsubscribe(Object.keys(this.topics));
        this.topics = [];
      }
      this.log('info', `Client unsubscribed from topics: ${Array.isArray(topics) ? topics.join(',') : topics}`);
    }
  }

  /**
   * Destroy the connection between the mqtt client and broker
   *
   * @return a promise containing the result of the operation
   */
  public async disconnect(): Promise<void> {
    if (this.mqttClient) {
      await this.unsubscribe();
      await this.mqttClient.end();
      this.mqttClient = undefined;
      this.emit('disconnected');
      this.log('info', 'disconnected');
    }
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
      let mqttConnectionParams: IClientOptions = {
        host: this.connectionParams.host,
        protocol: (this.tls) ? 'mqtts' : 'mqtt',
        port: (this.tls) ? this.connectionParams.protocols.mqtt.tlsPort : this.connectionParams.protocols.mqtt.port,
        username: `${this.connectionParams.vhost}:${this.connectionParams.deviceId || this.connectionParams.client}`,
        password: this.connectionParams.secret,
        clientId: this.connectionParams.deviceId || this.connectionParams.client,
        connectTimeout: opts.connectTimeout || SpaceBunny.DEFAULT_CONNECTION_TIMEOUT,
        reconnectPeriod: (this.autoReconnect) ? (opts.reconnectPeriod || SpaceBunny.DEFAULT_RECONNECT_TIMEOUT) : 0, // disable autoreconnect ??
        clean: (isNil(opts.clean)) ? true : opts.clean,
        keepalive: opts.keepalive || SpaceBunny.DEFAULT_HEARTBEAT,
        // ...opts
      };
      if (this.tls) { mqttConnectionParams = { ...mqttConnectionParams, ...this.tlsOpts }; }
      this.mqttClient = await mqtt.connectAsync(mqttConnectionParams);
      this.mqttClient.on('error', (reason) => {
        this.mqttClient = undefined;
        this.emit('error', reason);
      });
      this.mqttClient.on('close', (reason) => {
        this.mqttClient = undefined;
        this.emit('close', reason);
      });
      this.mqttClient.on('message', (msgTopic: string, message: Buffer) => {
        let msg: any = {};
        try {
          msg = JSON.parse(message.toString());
        } catch (e) {
          msg = message.toString();
        }
        Object.entries(this.mqttListeners).forEach(([, listener]) => {
          const { callback, topics } = listener;
          if (isEmpty(topics) || topics.includes(msgTopic)) {
            this.log('debug', `Received message for topic ${msgTopic}: ${msg.toString()}`);
            callback(msgTopic, msg);
          } else {
            this.log('silly', `Received unlistened message for topic ${msgTopic}: ${msg.toString()}`);
          }
        });
      });
      return this.mqttClient;
    } catch (error) {
      this.log('error', error);
      // do not overide handlers
      // const timeout = promisify(setTimeout);
      // await timeout(SpaceBunny.DEFAULT_RECONNECT_TIMEOUT);
      // this.connect(mqttConnectionParams);
    }
  }

  isConnected = () => {
    return (this.mqttClient && this.mqttClient.connected);
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
  public topicFor = (deviceId: string|void|null, channel: string) => {
    return `${deviceId || this.getDeviceId()}/${channel}`;
  }
}

export default MqttClient;
