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

// Import SockJS library
import SockJS from 'sockjs-client';

// Import SpaceBunny main module from which StompClient inherits
import SpaceBunny from '../spacebunny';

class StompClient extends SpaceBunny {

  /**
   * @constructor
   * @param {Object} opts - options must contain api-key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts) {
    super(opts);
    if (typeof process === 'object' && `${process}` === '[object process]') {
      this._protocol = 'stomp';
    } else {
      this._protocol = 'webStomp';
    }
    this._webSocketProtocol = 'http://';
    this._webSocketSecureProtocol = 'https://';
    this._stompConnection = undefined;
    this._subscription = undefined;
    this._connectionHeaders = {
      max_hbrlck_fails: 10,
      'accept-version': '1.0,1.1,1.2',
      'heart-beat': '10000,10000'
    };
    this._existingQueuePrefix = 'amq/queue';
    this._stompSubscriptionPrefix = 'stomp-subscription-';
    this.getConnectionParams();
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
        // amq/queue is the form for existing queues
        this._subscription = client.subscribe(
          this._subcriptionFor(this._existingQueuePrefix, this._inputTopic), (message) => {
            // TODO filterMine and filterWeb
            callback(message);
          }, (reason) => {
            reject(reason);
          });
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
        this._subscription.unsubscribe();
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
    const connectionParams = this._connectionParams;

    return new Promise((resolve, reject) => {
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
            const protocol = (this._ssl) ? this._webSocketSecureProtocol : this._webSocketProtocol;
            const port = (this._ssl) ? connectionParams.protocols.webStomp.sslPort :
              connectionParams.protocols.webStomp.port;
            // const connectionString = `${protocol}${connectionParams.host}:${port}/stomp`;
            const connectionString = `${protocol}${connectionParams.host}:${port}/stomp`;
            const ws = new SockJS(connectionString);
            client = Stomp.over(ws);
            // SockJS does not support heart-beat: disable heart-beats
            client.heartbeat.outgoing = 0;
            client.heartbeat.incoming = 0;
          }
          const headers = merge(this._connectionHeaders, {
            login: connectionParams.deviceId || connectionParams.client,
            passcode: connectionParams.secret,
            host: connectionParams.vhost
          });
          // if using stream client fix the name of the generated queue
          if (connectionParams.client) {
            headers['x-queue-name'] = `${this._stompSubscriptionPrefix}${connectionParams.deviceId}`;
          }
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

}

export default StompClient;
