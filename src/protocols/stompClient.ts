/**
 * A module that exports an StompClient client
 * which inherits from the SpaceBunny base client
 * @module StompClient
 */

// Import some helpers modules
import { isNullOrUndefined } from 'util';

// Import stomp library
import Stomp, { IMessage, StompHeaders } from '@stomp/stompjs';

import StompMessage from '../messages/stompMessage';
// Import SpaceBunny main module from which StompClient inherits
import SpaceBunny, { ISpaceBunnySubscribeOptions } from '../spacebunny';
import { encapsulateContent } from '../utils';

export interface IStompPublishOptions {
  routingKey?: string;
  topic?: string;
}

export interface IStompConsumeOptions extends ISpaceBunnySubscribeOptions {
  ack?: 'client';
}


class StompClient extends SpaceBunny {
  protected stompClient: Stomp.Client;

  protected subscription: Stomp.StompSubscription;

  protected connectionHeaders: StompHeaders;

  protected connectionOpts: any;

  protected existingQueuePrefix: string;

  protected defaultResource: string;

  protected ackTypes: string[];

  protected wsEndpoint: string;

  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts: any = {}) {
    super(opts);
    this.subscription = undefined;
    this.protocol = 'ws';
    this.tlsProtocol = 'wss';
    this.wsEndpoint = 'ws';
    this.connectionHeaders = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      max_hbrlck_fails: '10',
      'accept-version': '1.0,1.1,1.2',
      'heart-beat': '10000,10000'
    };
    this.connectionOpts = {};
    this.existingQueuePrefix = 'amq/queue';
    this.defaultResource = 'exchange';
    this.ackTypes = ['client'];
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is received
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  public onReceive = (callback: Function, opts: IStompConsumeOptions = {}): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // subscribe for input messages
        const topic = this.subcriptionFor(this.existingQueuePrefix, this.inboxTopic);
        const subscriptionCallback = (message: IMessage) => {
          // Create message object
          const stompMessage = new StompMessage({ message, receiverId: this.getDeviceId(), subscriptionOpts: opts });
          const ackNeeded = this.autoAck(opts.ack);
          // Check if should be accepted or not
          if (stompMessage.blackListed()) {
            if (ackNeeded) { message.nack(); }
            return;
          }
          // Call message callback
          callback(stompMessage);
          // Check if ACK is needed
          if (ackNeeded) { message.ack(); }
        };
        this.subscription = this.stompClient.subscribe(topic, subscriptionCallback);
        resolve();
      } catch (error) {
        this.log('error', error);
        reject(error);
      }
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
  publish = (channel: string, message: any, opts: IStompPublishOptions = {}): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      try {
        // Publish message
        const { routingKey = undefined, topic = undefined } = opts;
        const destination = this.destinationFor({ channel, routingKey, topic });
        this.stompClient.publish({
          destination,
          headers: {},
          body: encapsulateContent(message),
        });
        resolve(true);
      } catch (error) {
        this.log('error', error);
        reject(error);
      }
    });
  }

  /**
   * Destroy the connection between the stomp client and broker
   *
   * @return a promise containing the result of the operation
   */
  disconnect = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        resolve(true);
      } else {
        try {
          if (this.subscription !== undefined) {
            this.subscription.unsubscribe();
          }
          this.stompClient.deactivate();
          this.stompClient = undefined;
          this.emit('disconnect');
          resolve(true);
        } catch (error) {
          reject(error);
        }
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
  public connect = async (opts: Stomp.StompConfig = {}): Promise<Stomp.Client> => {
    if (this.isConnected()) { return this.stompClient; }
    await this.getEndpointConfigs();
    // code is runnning in a browser: web STOMP uses Web sockets
    const protocol = (this.tls) ? this.tlsProtocol : this.protocol;
    const port = (this.tls)
      ? this.connectionParams.protocols.webStomp.tlsPort : this.connectionParams.protocols.webStomp.port;
    const connectionString = `${protocol}://${this.connectionParams.host}:${port}/ws}`;
    const stompConfig: Stomp.StompConfig = {
      // Typically login, passcode and vhost
      // Adjust these for your broker
      connectHeaders: {
        ...this.connectionHeaders,
        login: this.connectionParams.deviceId || this.connectionParams.client,
        passcode: this.connectionParams.secret,
        host: this.connectionParams.vhost
      },

      // Broker URL, should start with ws:// or wss:// - adjust for your broker setup
      brokerURL: connectionString,

      // Keep it off for production, it can be quit verbose
      // Skip this key to disable
      // debug: function (str) {
      //   console.log('STOMP: ' + str);
      // },

      // If disconnected, it will retry after reconnectDelay ms
      reconnectDelay: (this.autoReconnect) ? opts.reconnectDelay || SpaceBunny.DEFAULT_RECONNECT_TIMEOUT : 0,

      heartbeatIncoming: opts.heartbeatIncoming || SpaceBunny.DEFAULT_HEARTBEAT,

      heartbeatOutgoing: opts.heartbeatOutgoing || SpaceBunny.DEFAULT_HEARTBEAT,

      // Subscriptions should be done inside onConnect as those need to reinstated when the broker reconnects
      onConnect: () => { this.emit('connect'); },

      // onStompError: (frame) => {}
    };
    this.stompClient = new Stomp.Client(stompConfig);

    this.stompClient.activate();

    return this.stompClient;
  }

  public isConnected = () => {
    return (this.stompClient !== undefined && this.stompClient.connected);
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
  public subcriptionFor = (type: string, channel: string) => {
    return `/${type}/${this.getDeviceId()}.${channel}`;
  }

  /**
   * Generate the destination string for a specific channel
   *
   * @private
   * @param {String} type - resource type on which subscribe or publish [exchange/queue]
   * @param {String} channel - channel name on which you want to publish a message
   * @return a string that represents the topic name for that channel
   */
  public destinationFor = (params: any = {}) => {
    const {
      type = this.defaultResource, channel = '',
      topic = '', routingKey = ''
    } = params;
    let messageRoutingKey: string;
    if (routingKey.length > 0) {
      messageRoutingKey = routingKey;
    } else {
      messageRoutingKey = this.getDeviceId();
      if (!isNullOrUndefined(channel) && channel.length > 0) {
        messageRoutingKey += `.${channel || ''}`;
      }
      if (!isNullOrUndefined(topic) && topic.length > 0) {
        messageRoutingKey += `.${topic || ''}`;
      }
    }
    return `/${type}/${this.getDeviceId()}/${messageRoutingKey}`;
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
  protected autoAck = (ack: string) => {
    if (ack) {
      if (!this.ackTypes.includes(ack)) {
        this.emit('error', 'Wrong acknowledge type'); // eslint-disable-line no-console
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
