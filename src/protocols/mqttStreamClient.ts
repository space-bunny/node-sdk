/**
 * A module that exports an MqttStreamClient client
 * which inherits from the Mqtt base client
 * @module MqttStreamClient
 */

import { IClientSubscribeOptions, QoS } from 'async-mqtt';
// Import some helpers modules
import { isNullOrUndefined } from 'util';

import { ILiveStreamHook } from '../spacebunny';
// Import MqttClient main module from which MqttStreamClient inherits
import MqttClient from './mqttClient';

export type IMqttCallback = (topic?: string, message?: any) => Promise<void>|void;
export interface IMqttLiveStreamHook extends ILiveStreamHook {
  callback: IMqttCallback;
  qos?: QoS;
}

class MqttStreamClient extends MqttClient {
  private defaultStreamRoutingKey: string;

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  constructor(opts: any = {}) {
    super(opts);
    this.defaultStreamRoutingKey = '#';
  }

  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */
  public streamFrom = async (streamHooks: IMqttLiveStreamHook | Array<IMqttLiveStreamHook> = [], opts: IClientSubscribeOptions = { qos: 1 }): Promise<Array<string | void>> => {
    const hooks: Array<IMqttLiveStreamHook> = Array.isArray(streamHooks) ? streamHooks : [streamHooks];
    const promises = [];
    for (let index = 0; index < hooks.length; index += 1) {
      const streamHook = hooks[index];
      const promise = this.addStreamHook(streamHook, opts);
      promises.push(promise);
    }
    return Promise.all(promises) as Promise<Array<string | void>>;
  }

  /**
  * Start consuming messages from a device's channel
  * It generates an auto delete queue from which consume
  * and binds it to the channel exchange
  *
  * @private
  * @param {Object} streamHook - Object containit hook info
  * { stream: {String}, callback: {func}}
  * or
  * { deviceId: {String}, channel: {String}, callback: {func}}
  * @param {Object} opts - connection options
  * @return a promise containing current connection
  */
  public addStreamHook = async (streamHook: IMqttLiveStreamHook, opts: IClientSubscribeOptions = { qos: 1 }): Promise<string | void> => {
    const {
      stream = undefined, deviceId = undefined, channel = undefined,
      topic = undefined, routingKey = undefined, qos = undefined,
      callback = undefined, cache = true
    } = streamHook;
    if (isNullOrUndefined(stream) && (isNullOrUndefined(channel) || isNullOrUndefined(deviceId))) {
      this.log('error', 'Missing Stream or Device ID and Channel');
      return;
    }
    if (isNullOrUndefined(callback)) {
      this.log('error', 'Missing Callback');
      return;
    }
    let topicName: string = topic;
    let topicQOS: QoS = qos || this.connectionOpts.qos;
    if (!isNullOrUndefined(stream) && stream.length > 0) {
      if (!this.liveStreamExists(stream)) {
        console.error(`Stream ${stream || ''} does not exist`); // eslint-disable-line no-console
        return;
      }
      // Cached streams generate qos1 connections with persistent queues
      // Uncached streams generate qos0 connections with auto delete queues
      topicName = this.streamTopicFor(stream);
      topicQOS = (cache) ? 1 : 0;
    } else {
      // streams connected directly to a specific channel generate qos0 connections with auto delete queues
      topicName = this.streamChannelTopicFor({ deviceId, channel, topic, routingKey });
    }

    this.addMqttListener(topicName, callback, topicName);
    await this.subscribe(topicName, { ...this.connectionOpts, ...opts, qos: topicQOS });
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * Generate the topic for a specific channel
   *
   * @private
   * @param {String} deviceId - deviceId from which you want to stream
   * @param {String} channel - channel name from which you want to stream
   * @return a string that represents the topic name for that channel
   */
  private streamChannelTopicFor = (params: ILiveStreamHook = {}): string => {
    const {
      deviceId = '', channel = '',
      routingKey = '', topic = ''
    } = params;
    if (routingKey.length === 0 && deviceId.length === 0) {
      // if both routingKey and deviceId are empty return default routingKey
      return this.defaultStreamRoutingKey;
    }
    if (routingKey.length > 0) {
      // return routing key if present
      return routingKey;
    }
    let streamRoutingKey = deviceId || this.getDeviceId();
    if (channel.length > 0) { streamRoutingKey += `/${channel}`; }
    if (topic.length > 0) { streamRoutingKey += `/${topic}`; }
    return `${streamRoutingKey}`;
  }

  /**
   * Generate the topic for a specific stream
   *
   * @private
   * @param {String} streamName - stream name from which you want to stream
   * @return a string that represents the topic name for that stream
   */
  streamTopicFor = (stream = ''): string => {
    return `${stream}/${this.liveStreamSuffix}`;
  }
}

// Remove unwnated methods inherited from MqttClient
delete MqttStreamClient.prototype.onMessage;
delete MqttStreamClient.prototype.publish;

export default MqttStreamClient;
