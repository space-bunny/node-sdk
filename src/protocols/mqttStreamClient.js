/**
 * A module that exports an MqttStreamClient client
 * which inherits from the Mqtt base client
 * @module MqttStreamClient
 */

// Import some helpers modules
import merge from 'merge';
import Promise from 'bluebird';

// Import MqttClient main module from which MqttStreamClient inherits
import MqttClient from './mqttClient';
import SpaceBunnyErrors from '../spacebunnyErrors';
import { keys } from 'lodash';

class MqttStreamClient extends MqttClient {

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  constructor(opts) {
    super(opts);
  }

  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */
  streamFrom(streamHooks, opts) {
    const emptyFunction = function() { return undefined; };
    streamHooks.forEach((streamHook) => {
      const stream = streamHook.stream;
      const deviceId = streamHook.deviceId;
      const channel = streamHook.channel;
      const qos = streamHook.qos;
      if (stream === undefined && (channel === undefined || deviceId === undefined)) {
        throw new SpaceBunnyErrors.MissingStreamConfigurations('Missing Stream or Device ID and Channel');
      }
      if (stream) {
        this._topics[this._streamTopicFor(stream)] = qos || this._connectionOpts.qos;
      } else {
        this._topics[this._streamChannelTopicFor(deviceId, channel)] = qos || this._connectionOpts.qos;
      }
    });
    return new Promise((resolve, reject) => {
      this._connect().then((mqttClient) => {
        mqttClient.subscribe(this._topics, merge(this._connectionOpts, opts), (err) => {
          if (err) {
            reject(false);
          } else {
            console.log(`streaming from ${keys(this._topics)}`); // eslint-disable-line no-console
            mqttClient.on('message', function(topic, message) {
              const splitted = topic.split('/');
              const callback = streamHooks.filter(function(streamHook) {
                return streamHook.stream === splitted[0] || (streamHook.deviceId === splitted[0] && streamHook.channel === splitted[1]);
              })[0].callback || emptyFunction;
              callback(topic, message);
            });
            resolve(true);
          }
        });
      }).catch(function(reason) {
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
  _streamChannelTopicFor(deviceId, channel) {
    return `${deviceId}/${channel}`;
  }

  /**
   * Generate the topic for a specific stream
   *
   * @private
   * @param {String} stream - stream identifier
   * @return a string that represents the topic name for that stream
   */
  _streamTopicFor(stream) {
    return `${stream}/${this._liveStreamSuffix}`;
  }
}

// Remove unwnated methods inherited from MqttClient
delete MqttStreamClient.onReceive;
delete MqttStreamClient.publish;
delete MqttStreamClient._topicFor;

export default MqttStreamClient;