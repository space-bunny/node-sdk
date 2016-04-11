/**
 * A module that exports an StompClient client
 * which inherits from the SpaceBunny base client
 * @module StompClient
 */

// Import some helpers modules
import merge from 'merge';
import Promise from 'bluebird';
import _ from 'lodash';

// Import stomp library
import Stomp from 'stompjs';

// Import SpaceBunny main module from which StompClient inherits
import SpaceBunny from '../spacebunny';
import StompMessage from '../messages/stompMessage';
const CONFIG = require('../../config/constants').CONFIG;

class StompClient extends SpaceBunny {

  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts) {
    super(opts);
    this._stompConnection = undefined;
    this._subscription = undefined;
    if (typeof process === 'object' && `${process}` === '[object process]') {
      this._protocol = 'stomp';
    } else {
      this._protocol = 'webStomp';
    }
    const stompOpts = CONFIG.stomp;
    const webStompOpts = CONFIG.webStomp;
    this._webSocketOpts = webStompOpts.webSocket;
    this._connectionHeaders = stompOpts.connection.headers;
    this._existingQueuePrefix = stompOpts.existingQueuePrefix;
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
        const topic = this._subcriptionFor(this._existingQueuePrefix, this._inboxTopic);
        const subscriptionCallback = (message) => {
          // Create message object
          const stompMessage = new StompMessage(message, this._deviceId, opts);
          const ackNeeded = this._autoAck(opts.ack);
          // Check if should be accepted or not
          if (stompMessage.blackListed()) {
            if (ackNeeded) { message.nack(); }
            return;
          }
          // Call message callback
          callback(this._parseContent(stompMessage.body), stompMessage.headers);
          // Check if ACK is needed
          if (ackNeeded) { message.ack(); }
        };
        this._subscription = client.subscribe(topic, subscriptionCallback);
        resolve(true);
      }).catch((reason) => {
        reject(reason);
      });
    });
  }

  /**
   * Publish a message on a specific channel
   *
   * @param {String} channel - channel name on which you want to publish a message
   * @param {Object} message - the message payload
   * @param {Object} opts - publication options
   * @return a promise containing the result of the operation
   */
  publish(channel, message, opts) {
    opts = merge({}, opts);
    // Publish message
    return new Promise((resolve, reject) => {
      this._connect().then((client) => {
        const destination = this._destinationFor('exchange', channel);
        client.send(destination, this._connectionHeaders, this._encapsulateContent(message));
        resolve(true);
      }).catch((reason) => {
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
      if (this._stompConnection === undefined) {
        reject('Invalid connection');
      } else {
        if (this._subscription !== undefined) {
          this._subscription.unsubscribe();
        }
        this._stompConnection.disconnect(() => {
          this._stompConnection = undefined;
          resolve(true);
        }).catch((reason) => {
          reject(reason);
        });
      }
    });
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * Establish an stomp connection with the broker.
   * If a connection already exists, returns the current connection
   *
   * @private
   * @param {Object} opts - connection options
   * @return a promise containing current connection
   */
  _connect(opts) {
    opts = merge({}, opts);
    return new Promise((resolve, reject) => {
      this.getEndpointConfigs().then((endpointConfigs) => {
        const connectionParams = endpointConfigs.connection;
        if (this._stompConnection !== undefined) {
          resolve(this._stompConnection);
        } else {
          try {
            let client = undefined;
            if (typeof process === 'object' && `${process}` === '[object process]') {
              // code is runnning in nodejs: STOMP uses TCP sockets
              if (this._ssl) {
                client = Stomp.overTCP(connectionParams.host, connectionParams.protocols.stomp.sslPort, this._sslOpts);
              } else {
                client = Stomp.overTCP(connectionParams.host, connectionParams.protocols.stomp.port);
              }
            } else {
              // code is runnning in a browser: web STOMP uses Web sockets
              const protocol = (this._ssl) ? this._webSocketOpts.ssl.protocol : this._webSocketOpts.protocol;
              const port = (this._ssl) ? connectionParams.protocols.webStomp.sslPort :
                connectionParams.protocols.webStomp.port;
              const connectionString = `${protocol}://${connectionParams.host}:${port}/${this._webSocketOpts.endpoint}`;
              const ws = new WebSocket(connectionString);
              client = Stomp.over(ws);
              client.heartbeat.outgoing = 10000;
              client.heartbeat.incoming = 10000;
              client.debug = null;
            }
            const headers = merge(this._connectionHeaders, {
              login: connectionParams.deviceId || connectionParams.client,
              passcode: connectionParams.secret,
              host: connectionParams.vhost
            });
            client.connect(headers, () => {
              this._stompConnection = client;
              resolve(this._stompConnection);
            }, (err) => {
              reject(err);
            });
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
   * Generate the subscription string for a specific channel
   *
   * @private
   * @param {String} type - resource type on which subscribe or publish [exchange/queue]
   * @param {String} channel - channel name on which you want to publish a message
   * @return a string that represents the topic name for that channel
   */
  _subcriptionFor(type, channel) {
    return `/${type}/${this.deviceId()}.${channel}`;
  }

  /**
   * Generate the destination string for a specific channel
   *
   * @private
   * @param {String} type - resource type on which subscribe or publish [exchange/queue]
   * @param {String} channel - channel name on which you want to publish a message
   * @return a string that represents the topic name for that channel
   */
  _destinationFor(type, channel) {
    return `/${type}/${this.deviceId()}/${this.deviceId()}.${channel}`;
  }

  /**
   * Check if the SDK have to automatically ack messages
   * By default STOMP messages are acked by the server
   * they need to be acked if client subscribes with { ack: 'client' } option
   *
   * @private
   * @param {String} ack - the ack type, it should be 'client' or null
   * @return boolean - true if messages have to be autoacked, false otherwise
   */
  _autoAck(ack) {
    if (ack) {
      if (!_.includes(CONFIG[this._protocol].ackTypes, ack)) {
        console.error('Wrong acknowledge type'); // eslint-disable-line no-console
      }
      switch (ack) {
        case 'client':
          return false;
        default:
          return true;
      }
    }
    return false;
  }

}

export default StompClient;
