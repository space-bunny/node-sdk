/**
 * A module that exports an MqttClient client
 * which inherits from the SpaceBunny base client
 * @module MqttClient
 */

// Import some helpers modules
import merge from 'merge';
import Promise from 'bluebird';

// Import mqtt library
import mqtt from 'mqtt';

// Import SpaceBunny main module from which MqttClient inherits
import SpaceBunny from '../spacebunny';

class MqttClient extends SpaceBunny {

  /**
   * @constructor
   * @param {Object} opts - options must contain api-key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts) {
    super(opts);
    this._protocol = 'mqtt';
    this._mqttConnection = undefined;
    this._subscription = undefined;
    this._connectionOpts = { qos: 1 };
    this._connectTimeout = 5000;
    this._topics = {};
    this._sslOpts.protocol = 'mqtts';
    this._sslOpts.rejectUnauthorized = true;
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is received
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  onReceive(callback, opts) {
    opts = merge({}, opts);
    // subscribe for input messages
    return new Promise((resolve, reject) => {
      this._connect().then((client) => {
        this._topics[this._topicFor(this._inputTopic)] = opts.qos || this._connectionOpts.qos;
        client.subscribe(this._topics, merge(this._connectionOpts, opts), (err) => {
          if (err) {
            reject(false);
          } else {
            client.on('message', (topic, message) => {
              // TODO filterMine and filterWeb
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

  /**
   * Publish a message on a specific channel
   *
   * @param {String} channel - channel name on which you want to publish a message
   * @param {Object/String} message - the message payload
   * @param {Object} opts - publication options
   * @return a promise containing the result of the operation
   */
  publish(channel, message, opts) {
    // Publish message
    return new Promise((resolve, reject) => {
      this._connect().then((client) => {
        client.on('connect', () => {
          const bufferedMessage = new Buffer(this._encapsulateContent(message));
          client.publish(this._topicFor(channel), bufferedMessage, merge(this._connectionOpts, opts), () => {
            resolve(true);
          });
        });
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
      this._mqttConnection.unsubscribe(Object.keys(topics)).then(() => {
        resolve(true);
      }).catch((reason) => {
        reject(reason);
      });
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
        reject('Invalid connection');
      } else {
        this._mqttConnection.unsubscribe(this._topics).then(() => {
          this._mqttConnection.end().then(() => {
            this._mqttConnection = undefined;
            resolve(true);
          });
        }).catch((reason) => {
          reject(reason);
        });
      }
    });
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * Establish an mqtt connection with the broker.
   * If a connection already exists, returns the current connection
   *
   * @private
   * @param {Object} opts - connection options
   * @return a promise containing current connection
   */
  _connect(opts) {
    opts = merge({}, opts);

    return new Promise((resolve, reject) => {
      this.getConnectionParams().then((connectionParams) => {
        if (this._mqttConnection !== undefined) {
          resolve(this._mqttConnection);
        } else {
          try {
            let mqttConnectionParams = {
              host: connectionParams.host,
              port: (this._ssl) ? connectionParams.protocols.mqtt.sslPort : connectionParams.protocols.mqtt.port,
              username: `${connectionParams.vhost}:${connectionParams.deviceId || connectionParams.client}`,
              password: connectionParams.secret,
              clientId: connectionParams.deviceId || connectionParams.client,
              connectTimeout: opts.connectTimeout || this._connectTimeout
            };
            if (this._ssl) {
              mqttConnectionParams = merge(mqttConnectionParams, this._sslOpts);
            }
            const client = mqtt.connect(mqttConnectionParams);
            client.on('error', (reason) => {
              reject(reason);
            });
            client.on('close', (reason) => {
              reject(reason);
            });
            this._mqttConnection = client;
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

  /**
   * Generate the topic for a specific channel
   *
   * @private
   * @param {String} channel - channel name on which you want to publish a message
   * @return a string that represents the topic name for that channel
   */
  _topicFor(channel) {
    return `${this.deviceId()}/${channel}`;
  }
}

export default MqttClient;
