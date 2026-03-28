/**
 * A module that exports an MqttClient client
 * which inherits from the SpaceBunny base client
 * @module MqttClient
 */

import mqtt, {
  type MqttClient as MqttClientType,
  type IClientOptions,
  type IClientPublishOptions,
  type IClientSubscribeOptions,
} from 'mqtt';
import type { QoS } from 'mqtt-packet';
import fs from 'fs';

import SpaceBunny, { ICachedMessage, ISpaceBunnyParams } from '../spacebunny';
import { encapsulateContent, isDeepStrictEqual, isNullOrUndefined } from '../utils';

export type IMqttCallback = (topic?: string, message?: any) => Promise<void> | void;
export type IMqttListener = {
  callback: IMqttCallback;
  topics?: string[];
};

export type IMqttConnectionOptions = {
  qos?: QoS;
  clean?: boolean;
  reconnectPeriod?: number;
  keepalive?: number;
  connectTimeout?: number;
};

class MqttClient extends SpaceBunny {
  protected mqttClient: MqttClientType | undefined;

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
    if (cert) {
      this.tlsOpts.cert = fs.readFileSync(cert);
    }
    if (key) {
      this.tlsOpts.key = fs.readFileSync(key);
    }
    if (passphrase) {
      this.tlsOpts.passphrase = passphrase;
    }
    if (ca) {
      if (Array.isArray(ca)) {
        this.tlsOpts.ca = ca.map((element) => {
          return fs.readFileSync(element);
        });
      } else {
        this.tlsOpts.ca = [fs.readFileSync(ca)];
      }
    }
    if (pfx) {
      this.tlsOpts.pfx = fs.readFileSync(pfx);
    }
    if (disableCertCheck) {
      this.tlsOpts.rejectUnauthorized = false;
    } else {
      this.tlsOpts.rejectUnauthorized = true;
    }
    this.on('connect', () => {
      void this.publishCachedMessages();
    });
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is received
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  public onMessage = async (
    callback: IMqttCallback,
    opts: IClientSubscribeOptions = { qos: 1 }
  ): Promise<string | void> => {
    // subscribe for inbox messages
    const topic = this.topicFor(null, this.inboxTopic);
    this.addMqttListener(topic, callback, topic);
    await this.subscribe(topic, opts);
    return topic;
  };

  /**
   * Publish a message on a specific channel
   *
   * @param {String} channel - channel name on which you want to publish a message
   * @param {Object/String} message - the message payload
   * @param {Object} opts - publication options
   * @return a promise containing the result of the operation
   */
  public publish = async (
    channel: string,
    message: Record<string, unknown>,
    opts: IClientPublishOptions = { qos: 1 }
  ): Promise<boolean> => {
    // Publish message
    if (this.isConnected()) {
      const topic = this.topicFor(null, channel);
      try {
        const bufferedMessage = Buffer.from(encapsulateContent(message));
        await this.mqttClient!.publishAsync(topic, bufferedMessage, opts);
        this.log('silly', `Published message on topic ${topic}`);
        return true;
      } catch (error) {
        this.log('error', `Error publishing on topic ${topic}`);
        throw error;
      }
    } else {
      throw new Error(
        `${this.getClassName()} - Error sending message on channel ${channel} when client is not connected.`
      );
    }
  };

  /**
   * Destroy the connection between the mqtt client and broker
   *
   * @return a promise containing the result of the operation
   */
  public async disconnect(): Promise<boolean> {
    if (this.isConnected()) {
      try {
        await this.unsubscribe();
        this.mqttClient!.removeAllListeners();
        await this.mqttClient!.endAsync();
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
  public connect = async (opts: IClientOptions = {}): Promise<MqttClientType | void> => {
    if (this.isConnected()) {
      return this.mqttClient;
    }
    await this.getEndpointConfigs();
    try {
      const clientId = this.connectionParams.deviceId || this.connectionParams.client;
      let mqttConnectionParams: IClientOptions = {
        host: this.connectionParams.host,
        protocol: this.tls ? 'mqtts' : 'mqtt',
        port: this.tls ? this.connectionParams.protocols!.mqtt!.tlsPort : this.connectionParams.protocols!.mqtt!.port,
        username: `${this.connectionParams.vhost}:${clientId}`,
        password: this.connectionParams.secret,
        // Client id is used for resource authorization, multiple clients with the same clientId are not allowed
        clientId,
        connectTimeout: opts.connectTimeout || this.connectionTimeout,
        reconnectPeriod: this.autoReconnect ? opts.reconnectPeriod || this.reconnectTimeout : 0, // disable autoreconnect ??
        clean: isNullOrUndefined(opts.clean) ? true : opts.clean,
        keepalive: opts.keepalive || this.heartbeat,
        // ...opts
      };
      if (this.tls) {
        mqttConnectionParams = { ...mqttConnectionParams, ...this.tlsOpts };
      }
      this.mqttClient = await mqtt.connectAsync(mqttConnectionParams);
      this.mqttClient.on('error', (err: Error) => {
        this.emit('error', err);
        this.log('error', err);
      });
      this.mqttClient.on('close', () => {
        this.log('info', 'Connection closed');
      });
      this.mqttClient.on('offline', () => {
        this.log('warn', 'Client offline');
      });
      this.mqttClient.on('reconnect', () => {
        this.log('info', 'Reconnecting...');
      });
      this.mqttClient.on('message', (msgTopic: string, message: Buffer) => {
        try {
          let msg: Record<string, unknown> | string = {};
          try {
            msg = JSON.parse(message.toString()) as Record<string, unknown>;
          } catch (e) {
            msg = message.toString();
          }
          Object.entries(this.mqttListeners).forEach(([, listener]) => {
            const { callback, topics } = listener;
            if (!topics || topics.length === 0 || topics.includes(msgTopic)) {
              this.log('debug', `Received message for topic ${msgTopic}`, msg);
              void callback(msgTopic, msg);
            } else {
              this.log('silly', `Received unlistened message for topic ${msgTopic}`, msg);
            }
          });
        } catch (error) {
          this.log('error', 'Error consuming message');
          this.log('error', error as Error);
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
        this.log('error', (error as Error).message);
        await new Promise((resolve) => setTimeout(resolve, this.reconnectTimeout));
        void this.connect(opts);
      } else {
        throw error;
      }
    }
  };

  isConnected = (): boolean => {
    return !isNullOrUndefined(this.mqttClient) && this.mqttClient.connected;
  };

  // ------------ PROTECTED METHODS -------------------

  protected addMqttListener = (name: string, callback: IMqttCallback, topics?: string | string[]): void => {
    this.mqttListeners[name] = { callback, topics: Array.isArray(topics) ? topics : topics ? [topics] : [] };
  };

  protected removeMqttListener = (name: string): void => {
    delete this.mqttListeners[name];
  };

  protected subscribe = async (
    topics: string | string[],
    opts: IClientSubscribeOptions = { qos: 1 }
  ): Promise<void> => {
    if (this.isConnected()) {
      const topicsToSubscribe = Array.isArray(topics) ? topics : [topics];
      await this.mqttClient!.subscribeAsync(topicsToSubscribe, opts);
      this.topics.push(...topicsToSubscribe);
      this.log('info', `Client subscribed to topics: ${topicsToSubscribe.join(',')}`);
    } else {
      throw new Error(`${this.getClassName()} - Trying to subscribe when client is not connected`);
    }
  };

  /**
   * Unsubscribe client from a list of topics
   *
   * @param {Object} topics - list of topics { topic: qos, ... }
   * e.g. { topic_1: 1, topic_2: 0 }
   * @return a promise containing the result of the operation
   */
  protected async unsubscribe(topics: string | string[] = []): Promise<void> {
    let topicsToUnsubscribe = this.topics.length > 0 && topics.length === 0 ? this.topics : topics;
    topicsToUnsubscribe = Array.isArray(topicsToUnsubscribe) ? topicsToUnsubscribe : [topicsToUnsubscribe];
    if (this.isConnected()) {
      if (topicsToUnsubscribe.length > 0) {
        await this.mqttClient!.unsubscribeAsync(topicsToUnsubscribe);
      }
      this.topics = this.topics.filter((t) => !topicsToUnsubscribe.includes(t));
      this.log('info', `Client unsubscribed from topics: ${topicsToUnsubscribe.join(',')}`);
    } else {
      throw new Error(
        `${this.getClassName()} - Error trying to unsucscribe from ${topicsToUnsubscribe.join(',')} on an invalid connection`
      );
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
  private topicFor = (deviceId: string | void | null, channel: string) => {
    return `${deviceId || this.getDeviceId()}/${channel}`;
  };

  private publishCachedMessages = async () => {
    if (this.isConnected() && this.cachedMessages.length > 0) {
      const cachedMessagesToSend = structuredClone(this.cachedMessages);
      this.log('debug', `Publishing ${cachedMessagesToSend.length} cached messages...`);
      for (let index = 0; index < cachedMessagesToSend.length; index += 1) {
        const cachedMessage = cachedMessagesToSend[index];
        this.log('silly', `Sending message ${index + 1} from cache`);
        const { message, channel, options } = cachedMessage;
        // eslint-disable-next-line no-await-in-loop
        const res: boolean = await this.publish(channel, message, { qos: 1, ...options });
        if (res) {
          // remove message from cache when successful send
          const itemToRemove = this.cachedMessages.findIndex((el: ICachedMessage) => {
            return isDeepStrictEqual(el, cachedMessage);
          });
          if (itemToRemove !== -1) {
            this.cachedMessages.splice(itemToRemove, 1);
          }
        }
      }
      this.writeCachedMessagesFile();
    }
  };
}

export default MqttClient;
