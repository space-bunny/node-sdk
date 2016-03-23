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

class MqttStreamClient extends MqttClient {

  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */
  streamFrom(streamHooks, opts) {
    return new Promise((resolve, reject) => {
      this._connect().then((mqttClient) => {
        const emptyFunction = () => { return undefined; };
        streamHooks.forEach((streamHook) => {
          const stream = streamHook.stream;
          const deviceId = streamHook.deviceId;
          const channel = streamHook.channel;
          const qos = streamHook.qos;
          const cache = (typeof(streamHook.cache) !== 'boolean') ? true : streamHook.cache;
          if (stream === undefined && (channel === undefined || deviceId === undefined)) {
            reject('Missing Stream or Device ID and Channel');
          }
          if (stream) {
            // Cached streams generate qos1 connections with persistent queues
            // Uncached streams generate qos0 connections with auto delete queues
            this._topics[this._streamTopicFor(stream)] = (cache) ? 1 : 0;
          } else {
            // streams connected directly to a specific channel generate qos0 connections with auto delete queues
            this._topics[this._streamChannelTopicFor(deviceId, channel)] = qos || this._connectionOpts.qos;
          }
        });
        mqttClient.subscribe(this._topics, merge(this._connectionOpts, opts), (err) => {
          if (err) {
            reject(false);
          } else {
            mqttClient.on('message', (topic, message) => {
              const splitted = topic.split('/');
              const streams = streamHooks.filter((streamHook) => {
                return this.liveStreamByName(streamHook.stream) === splitted[0] ||
                  (streamHook.deviceId === splitted[0] && streamHook.channel === splitted[1]);
              });
              let callback = emptyFunction;
              if (streams.length > 0) {
                callback = streams[0].callback || emptyFunction;
              }
              callback(topic, message);
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
  _streamChannelTopicFor(deviceId, channel) {
    return `${deviceId}/${channel}`;
  }

  /**
   * Generate the topic for a specific stream
   *
   * @private
   * @param {String} streamName - stream name from which you want to stream
   * @return a string that represents the topic name for that stream
   */
  _streamTopicFor(stream) {
    return `${this.liveStreamByName(stream)}/${this._liveStreamSuffix}`;
  }
}

// Remove unwnated methods inherited from MqttClient
delete MqttStreamClient.onReceive;
delete MqttStreamClient.publish;
delete MqttStreamClient._topicFor;

export default MqttStreamClient;
