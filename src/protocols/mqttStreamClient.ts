/**
 * A module that exports an MqttStreamClient client
 * which inherits from the Mqtt base client
 * @module MqttStreamClient
 */

// Import some helpers modules
import _ from 'lodash';

import CONFIG from '../config/constants';
import { parseContent } from '../utils';
// Import MqttClient main module from which MqttStreamClient inherits
import MqttClient from './mqttClient';

class MqttStreamClient extends MqttClient {

  _defaultStreamRoutingKey: string;

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  constructor(opts: any = {}) {
    super(opts);
    const mqttStreamOptions = CONFIG.mqtt.stream;
    this._defaultStreamRoutingKey = mqttStreamOptions.defaultStreamRoutingKey;
  }
  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */
   streamFrom = (streamHooks: Array<any> = [], opts:any = {}): Promise<any> => {
     if (streamHooks.length > 0) {
       return Promise.mapSeries(streamHooks, (streamHook) => {
         return this._attachStreamHook(streamHook, opts);
       });
     } else {
       return Promise.reject(new Error('Missing stream hooks'));
     }
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
    _attachStreamHook = (streamHook: any, opts: any = {}): Promise<any> => {
      return new Promise((resolve, reject) => {
        this.connect().then((mqttClient) => {
          const {
            stream = undefined, deviceId = undefined, channel = undefined,
            topic = undefined, routingKey = undefined, qos = undefined
          } = streamHook;
          const cache = (typeof (streamHook.cache) !== 'boolean') ? true : streamHook.cache;
          if (stream === undefined && (channel === undefined || deviceId === undefined)) {
            reject(new Error('Missing Stream or Device ID and Channel'));
          }
          const emptyFunction = function () { return undefined; };
          const callback = streamHook.callback || emptyFunction;

          if (!_.isEmpty(stream)) {
            if (!this.liveStreamExists(stream)) {
              console.error(`Stream ${stream || ''} does not exist`); // eslint-disable-line no-console
              resolve(false);
            }
            // Cached streams generate qos1 connections with persistent queues
            // Uncached streams generate qos0 connections with auto delete queues
            this._topics[this._streamTopicFor(stream)] = (cache) ? 1 : 0;
          } else {
            // streams connected directly to a specific channel generate qos0 connections with auto delete queues
            this._topics[this._streamChannelTopicFor({ deviceId, channel, topic, routingKey })] = qos || this._connectionOpts.qos;
          }
          let localOpts = _.cloneDeep(opts);
          localOpts = _.merge(_.cloneDeep(this._connectionOpts), localOpts);
          mqttClient.subscribe(this._topics, localOpts, (err) => {
            if (err) {
              reject(err);
            } else {
              mqttClient.on('message', (messageTopic, message) => {
                callback(messageTopic, parseContent(message));
              });
              resolve(true);
            }
          });
        }).catch((reason) => {
          reject(reason);
        });
      });
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
  _streamChannelTopicFor = (params: any = {}) => {
    const {
      deviceId = undefined, channel = undefined, routingKey = undefined, topic = undefined
    } = params;
    if (_.isEmpty(routingKey) && _.isEmpty(deviceId)) {
      // if both routingKey and deviceId are empty return default routingKey
      return this._defaultStreamRoutingKey;
    } else if (!_.isEmpty(routingKey)) {
      // return routing key if present
      return routingKey;
    } else {
      let streamRoutingKey = deviceId || this.deviceId();
      if (channel) { streamRoutingKey += `/${channel}`; }
      if (topic) { streamRoutingKey += `/${topic}`; }
      return `${streamRoutingKey}`;
    }
  }

  /**
   * Generate the topic for a specific stream
   *
   * @private
   * @param {String} streamName - stream name from which you want to stream
   * @return a string that represents the topic name for that stream
   */
  _streamTopicFor = (stream: string = '') => {
    return `${stream}/${this._liveStreamSuffix}`;
  }
}

// Remove unwnated methods inherited from MqttClient
delete MqttStreamClient.prototype.onReceive;
delete MqttStreamClient.prototype.publish;
delete MqttStreamClient.prototype._topicFor;

export default MqttStreamClient;
