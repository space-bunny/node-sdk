/**
 * A module that exports an MqttClient client
 * which inherits from the SpaceBunny base client
 * @module MqttClient
 */

import mqtt, {
  AsyncMqttClient, IClientOptions, IClientPublishOptions, IClientSubscribeOptions
} from 'async-mqtt';
import retry from 'async-retry';
import { isEmpty, merge, without } from 'lodash';

import CONFIG from '../config/constants';
import SpaceBunny, { ISpaceBunnyParams } from '../spacebunny';
import { encapsulateContent } from '../utils';

export type IMqttCallback = (topic?: string, message?: any) => Promise<void>;
export type IMqttListener = {
  callback: IMqttCallback;
  topics?: string[];
}

class MqttClient extends SpaceBunny {
  private mqttClient: AsyncMqttClient;

  private mqttListeners: { [name: string]: IMqttListener } = {};

  private topics: string[] = [];

  private connectionOpts: any;

  private connectionTimeout: number;

  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts: ISpaceBunnyParams = {}) {
    super(opts);
    const mqttOptions = CONFIG.mqtt;
    this.topics = [];
    this.mqttClient = undefined;
    this.protocol = mqttOptions.protocol;
    this.tlsOpts.protocol = mqttOptions.tls.protocol;
    this.tlsOpts.rejectUnauthorized = mqttOptions.tls.rejectUnauthorized;
    this.connectionOpts = mqttOptions.connection.opts;
    this.connectionTimeout = mqttOptions.connection.timeout;
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
      this.log('debug', 'Caching message');
      this.cacheMessage(channel, message, opts);
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
    if (this.isConnected()) {
      return this.mqttClient;
    }
    const localOpts = { ...this.connectionOpts, ...opts };
    const endpointConfigs = await this.getEndpointConfigs();
    const connectionParams = endpointConfigs.connection;
    try {
      let mqttConnectionParams = {
        host: connectionParams.host,
        port: (this.tls) ? connectionParams.protocols.mqtt.tlsPort : connectionParams.protocols.mqtt.port,
        username: `${connectionParams.vhost}:${connectionParams.deviceId || connectionParams.client}`,
        password: connectionParams.secret,
        clientId: connectionParams.deviceId || connectionParams.client,
        connectionTimeout: localOpts.connectionTimeout || this.connectionTimeout,
        clean: localOpts.clean,
        keepalive: 5,
        ...opts
      };
      if (this.tls) {
        mqttConnectionParams = merge(mqttConnectionParams, this.tlsOpts);
      }
      await retry(async () => {
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
      }, {
        minTimeout: this.reconnectTimeout,
        maxTimeout: this.reconnectTimeout,
        forever: true,
        onRetry: (e: Error) => { this.log('error', e.message); }
      });
    } catch (error) {
      this.log('error', error);
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
  protected topicFor = (deviceId: string|void|null, channel: string) => {
    return `${deviceId || this.getDeviceId()}/${channel}`;
  }
}

export default MqttClient;
