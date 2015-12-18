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
      const deviceId = streamHook.deviceId;
      const channel = streamHook.channel;
      const qos = streamHook.qos;
      if (deviceId === undefined || channel === undefined) {
        throw new SpaceBunnyErrors.MissingStreamConfigurations('Missing Device ID or Channel');
      }
      this._topics[this._streamTopicFor(deviceId, channel)] = qos || this._connectionOpts.qos;
    });
    return new Promise((resolve, reject) => {
      this.connect().then((mqttClient) => {
        mqttClient.subscribe(this._topics, merge(this._connectionOpts, opts), function(err) {
          if (err) {
            reject(false);
          } else {
            mqttClient.on('message', function(topic, message) {
              const splitted = topic.split('/');
              const callback = streamHooks.filter(function(streamHook) {
                return streamHook.deviceId === splitted[0] && streamHook.channel === splitted[1];
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
   * @param {String} channel - channel name on which you want to publish a message
   * @return a string that represents the topic name for that channel
   */
  _streamTopicFor(deviceId, channel) {
    return `${deviceId}/${channel}`;
  }
}

// Remove unwnated methods inherited from MqttClient
delete MqttStreamClient.onReceive;
delete MqttStreamClient.publish;
delete MqttStreamClient._topicFor;

export default MqttStreamClient;
