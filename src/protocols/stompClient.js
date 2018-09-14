/**
 * A module that exports an StompClient client
 * which inherits from the SpaceBunny base client
 * @module StompClient
 */

// Import some helpers modules
import Promise from 'bluebird';
import _ from 'lodash';

// Import stomp library
import Stomp from 'stompjs';

// Import SpaceBunny main module from which StompClient inherits
import SpaceBunny from '../spacebunny';
import StompMessage from '../messages/stompMessage';

const { CONFIG } = require('../../config/constants');

class StompClient extends SpaceBunny {
  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts = {}) {
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
    this._connectionOpts = stompOpts.connection.opts;
    this._existingQueuePrefix = stompOpts.existingQueuePrefix;
    this._defaultResource = stompOpts.defaultResource;
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
        const topic = this._subcriptionFor(this._existingQueuePrefix, this._inboxTopic);
        const subscriptionCallback = (message) => {
          // Create message object
          const stompMessage = new StompMessage(message, this._deviceId, localOpts);
          const ackNeeded = this._autoAck(localOpts.ack);
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
  publish(channel, message, opts = {}) {
    // Publish message
    return new Promise((resolve, reject) => {
      let localOpts = _.cloneDeep(opts);
      localOpts = _.merge({}, localOpts);
      this.connect().then((client) => {
        const { routingKey = undefined, topic = undefined } = localOpts;
        const destination = this._destinationFor({ channel, routingKey, topic });
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
      if (!this.isConnected()) {
        reject(new Error('Invalid connection'));
      } else {
        if (this._subscription !== undefined) {
          this._subscription.unsubscribe();
        }
        this._stompConnection.disconnect(() => {
          this.emit('disconnect');
          this._stompConnection = undefined;
          resolve(true);
        }).catch((reason) => {
          this._stompConnection = undefined;
          reject(reason);
        });
      }
    });
  }

  /**
   * Establish an stomp connection with the broker.
   * If a connection already exists, returns the current connection
   *
   * @param {Object} opts - connection options
   * @return a promise containing current connection
   */
  connect(opts = {}) {
    return new Promise((resolve, reject) => {
      // let localOpts = _.cloneDeep(opts);
      // localOpts = _.merge(_.cloneDeep(this._connectionOpts), localOpts);
      this.getEndpointConfigs().then((endpointConfigs) => {
        const connectionParams = endpointConfigs.connection;
        if (this.isConnected()) {
          resolve(this._stompConnection);
        } else {
          try {
            let client;
            if (typeof process === 'object' && `${process}` === '[object process]') {
              // code is runnning in nodejs: STOMP uses TCP sockets
              if (this._tls) {
                client = Stomp.overTCP(connectionParams.host, connectionParams.protocols.stomp.tlsPort, this._tlsOpts);
              } else {
                client = Stomp.overTCP(connectionParams.host, connectionParams.protocols.stomp.port);
              }
            } else {
              // code is runnning in a browser: web STOMP uses Web sockets
              const protocol = (this._tls) ? this._webSocketOpts.tls.protocol : this._webSocketOpts.protocol;
              const port = (this._tls)
                ? connectionParams.protocols.webStomp.tlsPort : connectionParams.protocols.webStomp.port;
              const connectionString = `${protocol}://${connectionParams.host}:${port}/${this._webSocketOpts.endpoint}`;
              const ws = new WebSocket(connectionString);
              client = Stomp.over(ws);
              client.heartbeat.outgoing = 10000;
              client.heartbeat.incoming = 10000;
              client.debug = null;
            }
            const headers = _.merge(_.cloneDeep(this._connectionHeaders), {
              login: connectionParams.deviceId || connectionParams.client,
              passcode: connectionParams.secret,
              host: connectionParams.vhost
            });
            client.connect(headers, () => {
              this._stompConnection = client;
              this.emit('connect');
              resolve(this._stompConnection);
            }, (err) => {
              this.emit('error', err.body);
              // this._stompConnection = undefined;
              // reject(err.body);
            });
            client.debug = (str) => {
              this.emit('debug', str);
            };
            this.on('error', () => {});
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
    return (this._stompConnection !== undefined && this._stompConnection.connected);
  }

  // ------------ PRIVATE METHODS -------------------

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
  _destinationFor(params = {}) {
    const {
      type = this._defaultResource, channel = undefined, topic = undefined, routingKey = undefined
    } = params;
    let messageRoutingKey;
    if (routingKey) {
      messageRoutingKey = routingKey;
    } else {
      messageRoutingKey = this.deviceId();
      if (!_.isEmpty(channel)) {
        messageRoutingKey += `.${channel}`;
      }
      if (!_.isEmpty(topic)) {
        messageRoutingKey += `.${topic}`;
      }
    }
    return `/${type}/${this.deviceId()}/${messageRoutingKey}`;
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
