/**
 * A module that exports an StompClient client
 * which inherits from the SpaceBunny base client
 * @module StompClient
 */

// Import some helpers modules
import merge from 'merge';
import Promise from 'bluebird';

// Import stomp library
import Stomp from 'stompjs';

// Import SpaceBunny main module from which StompClient inherits
import SpaceBunny from '../spacebunny';

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */
class StompClient extends SpaceBunny {
  constructor(opts) {
    super(opts);
    if (typeof process === 'object' && process + '' === '[object process]') {
      this._protocol = 'stomp';
    } else {
      this._protocol = 'web_stomp';
    }
    this._client = undefined;
    this._connectionHeaders = {
      'max_hbrlck_fails': 10,
      'accept-version': '1.0,1.1,1.2',
      'heart-beat': '10000,10000'
    };
    this._existingQueuePrefix = 'amq/queue';
    this.connection();
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is receviced
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  onReceive(callback, opts) {
    opts = merge({}, opts);
    // subscribe for input messages
    return new Promise((resolve, reject) => {
      this._connect().then((client) => {
        // amq/queue is the form for existing queues
        client.subscribe(this._subcriptionFor(this._existingQueuePrefix, this._inputTopic), function(message) {
          callback(message);
        }, function(reason) {
          reject(reason);
        });
        resolve(true);
      }).catch(function(reason) {
        reject(reason);
      });
    });
  }

  /**
   * Publish a message on a specific channel
   *
   * @param {String} channel - channel name on which you want to publish a message
   * @param {Object} message - the message payload
   * @param {Object} message - the message payload
   * @return promise containing true if the
   */
  publish(channel, message, opts) {
    opts = merge({}, opts);
    // Publish message
    return new Promise((resolve, reject) => {
      this._connect().then((client) => {
        client.send(this._destinationFor('exchange', channel), this._connectionHeaders, this._encapsulateContent(message));
        resolve(true);
      }).catch(function(reason) {
        reject(reason);
      });
    });
  }

  /**
   * Destroy the connection between the stomp client and broker
   *
   * @return a promise containing the result of the operation
   */
  disconnect() {
    return new Promise((resolve, reject) => {
      if (this._client === undefined) {
        reject('Invalid connection');
      } else {
        this._client.disconnect().then(function() {
          resolve(true);
        }).catch(function(reason) {
          reject(reason);
        });
      }
    });
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * @private
   * Establish an stomp connection with the broker
   * using configurations retrieved from the endpoint
   *
   * @param {Object} opts - connection options
   * @return a promise containing current connection
   */
  _connect(opts) {
    opts = merge({}, opts);
    const connectionParams = this._connectionParams;

    return new Promise((resolve, reject) => {
      if (this._client !== undefined) {
        resolve(this._client);
      } else {
        try {
          let client = undefined;
          if (typeof process === 'object' && process + '' === '[object process]') {
            // code is runnning in nodejs: STOMP uses TCP sockets
            client = Stomp.overTCP(connectionParams.host, connectionParams.protocols.stomp.port);
          } else {
            const SockJS = require('sockjs-client');
            // code is runnning in a browser: web STOMP uses Web sockets
            const connectionString = `http://${connectionParams.host}:${connectionParams.protocols.web_stomp.port}/stomp`;
            const ws = new SockJS(connectionString);
            client = Stomp.over(ws);
            // SockJS does not support heart-beat: disable heart-beats
            client.heartbeat.outgoing = 0;
            client.heartbeat.incoming = 0;
          }
          const headers = merge(this._connectionHeaders, {
            login: connectionParams.deviceId,
            passcode: connectionParams.secret,
            host: connectionParams.vhost
          });
          client.connect(headers, () => {
            this._client = client;
            resolve(this._client);
          }, function(err) {
            reject(err);
          });
        } catch (reason) {
          reject(reason);
        }
      }
    });
  }

  /**
   * @private
   * Generate the subscription string for a specific channel
   *
   * @param {String} type - resource type on which subscribe or publish [exchange/queue]
   * @param {String} channel - channel name on which you want to publish a message
   * @return a string that represents the topic name for that channel
   */
  _subcriptionFor(type, channel) {
    return `/${type}/${this.deviceId()}.${channel}`;
  }

  /**
   * @private
   * Generate the destination string for a specific channel
   *
   * @param {String} type - resource type on which subscribe or publish [exchange/queue]
   * @param {String} channel - channel name on which you want to publish a message
   * @return a string that represents the topic name for that channel
   */
  _destinationFor(type, channel) {
    return `/${type}/${this.deviceId()}/${this.deviceId()}.${channel}`;
  }

}

export default StompClient;
