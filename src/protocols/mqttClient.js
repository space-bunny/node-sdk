/**
 * A module that exports an MqttClient client
 * which inherits from the SpaceBunny base client
 * @module MqttClient
 */

// Import some helpers modules
import Promise from 'bluebird';
import _ from 'lodash';

// Import mqtt library
import mqtt from 'mqtt';

// Import SpaceBunny main module from which MqttClient inherits
import SpaceBunny from '../spacebunny';

const { CONFIG } = require('../../config/constants');

class MqttClient extends SpaceBunny {
  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts = {}) {
    super(opts);
    this._topics = {};
    this._mqttConnection = undefined;
    this._subscription = undefined;
    const mqttOptions = CONFIG.mqtt;
    this._protocol = mqttOptions.protocol;
    this._tlsOpts.protocol = mqttOptions.tls.protocol;
    this._tlsOpts.rejectUnauthorized = mqttOptions.tls.rejectUnauthorized;
    this._connectionOpts = mqttOptions.connection.opts;
    this._connectionTimeout = mqttOptions.connection.timeout;
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is received
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  onReceive(callback, opts = {}) {
    // subscribe for input messages
    return new Promise((resolve, reject) => {
      let localOpts = _.cloneDeep(opts);
      localOpts = _.merge({}, localOpts);
      this.connect().then((client) => {
        this._topics[this._topicFor(null, this._inboxTopic)] = localOpts.qos || this._connectionOpts.qos;
        client.subscribe(this._topics, _.merge(this._connectionOpts, localOpts), (err) => {
          if (err) {
            reject(err);
          } else {
            client.on('message', (topic, message) => {
              // TODO filterMine and filterWeb
              callback(topic, this._parseContent(message));
            });
            resolve(true);
          }
        });
      }).catch((reason) => {
        reject(reason);
      });
    });
  }

  /**
   * Publish a message on a specific channel
   *
   * @param {String} channel - channel name on which you want to publish a message
   * @param {Object/String} message - the message payload
   * @param {Object} opts - publication options
   * @return a promise containing the result of the operation
   */
  publish(channel, message, opts = {}) {
    // Publish message
    return new Promise((resolve, reject) => {
      this.connect().then((client) => {
        const _sendMessage = () => {
          const bufferedMessage = Buffer.from(this._encapsulateContent(message));
          let localOpts = _.cloneDeep(opts);
          localOpts = _.merge(this._connectionOpts, localOpts);
          client.publish(this._topicFor(null, channel), bufferedMessage, localOpts, () => {
            resolve(true);
          });
        };
        if (!client.connected) {
          client.on('connect', () => { _sendMessage(); });
        } else {
          _sendMessage();
        }
      }).catch((reason) => {
        reject(reason);
      });
    });
  }

  /**
   * Unsubscribe client from a list of topics
   *
   * @param {Object} topics - list of topics { topic: qos, ... }
   * e.g. { topic_1: 1, topic_2: 0 }
   * @return a promise containing the result of the operation
   */
  unsubscribe(topics) {
    return new Promise((resolve, reject) => {
      try {
        if (_.isEmpty(topics)) {
          resolve(true);
        } else {
          this._mqttConnection.unsubscribe(Object.keys(topics), () => {
            resolve(true);
          });
        }
      } catch (reason) {
        reject(reason);
      }
    });
  }

  /**
   * Destroy the connection between the mqtt client and broker
   *
   * @return a promise containing the result of the operation
   */
  disconnect() {
    return new Promise((resolve, reject) => {
      if (this._mqttConnection === undefined) {
        reject(new Error('Invalid connection'));
      } else {
        const _closeConnection = () => {
          this._mqttConnection.end(true, () => {
            this._mqttConnection = undefined;
            this.emit('disconnect');
            resolve(true);
          });
        };
        try {
          if (_.isEmpty(this._topics)) {
            _closeConnection();
          } else {
            this._mqttConnection.unsubscribe(Object.keys(this._topics), () => {
              _closeConnection();
            });
          }
        } catch (reason) {
          reject(reason);
        }
      }
    });
  }

  /**
   * Establish an mqtt connection with the broker.
   * If a connection already exists, returns the current connection
   *
   * @param {Object} opts - connection options
   * @return a promise containing current connection
   */
  connect(opts = {}) {
    return new Promise((resolve, reject) => {
      let localOpts = _.cloneDeep(opts);
      localOpts = _.merge(this._connectionOpts, localOpts);
      this.getEndpointConfigs().then((endpointConfigs) => {
        const connectionParams = endpointConfigs.connection;
        if (this._mqttConnection !== undefined) {
          resolve(this._mqttConnection);
        } else {
          try {
            let mqttConnectionParams = {
              host: connectionParams.host,
              port: (this._tls) ? connectionParams.protocols.mqtt.tlsPort : connectionParams.protocols.mqtt.port,
              username: `${connectionParams.vhost}:${connectionParams.deviceId || connectionParams.client}`,
              password: connectionParams.secret,
              clientId: connectionParams.deviceId || connectionParams.client,
              connectionTimeout: localOpts.connectionTimeout || this._connectionTimeout
            };
            if (this._tls) {
              mqttConnectionParams = _.merge(mqttConnectionParams, this._tlsOpts);
            }
            const client = mqtt.connect(mqttConnectionParams);
            client.on('error', (reason) => {
              this.emit('error', reason);
              reject(reason);
            });
            client.on('close', (reason) => {
              reject(reason);
              this.emit('close', reason);
              this._mqttConnection = undefined;
            });
            this._mqttConnection = client;
            this.emit('connect');
            resolve(this._mqttConnection);
          } catch (reason) {
            reject(reason);
          }
        }
      }).catch((reason) => {
        reject(reason);
      });
    });
  }

  isConnected() {
    return (this._mqttConnection !== undefined);
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
  _topicFor(deviceId, channel) {
    return `${deviceId || this.deviceId()}/${channel}`;
  }
}

export default MqttClient;
