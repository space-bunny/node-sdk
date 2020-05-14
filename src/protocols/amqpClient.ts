/**
 * A module that exports an AmqpClient client
 * which inherits from the SpaceBunny base client
 * @module AmqpClient
 */

// Import amqplib
import * as amqp from 'amqplib';
// Import some helpers modules
import { isNullOrUndefined } from 'util';

import AmqpMessage from '../messages/amqpMessage';
// Import SpaceBunny main module from which AmqpClient inherits
import SpaceBunny, { ISpaceBunnyParams, ISpaceBunnySubscribeOptions } from '../spacebunny';
import { encapsulateContent } from '../utils';

export interface IAmqpConsumeOptions extends ISpaceBunnySubscribeOptions {
  allUpTo?: boolean;
  ack?: 'auto' | 'manual' | void;
  requeue?: boolean;
}

export interface IRoutingKey {
  channel?: string;
  routingKey?: string;
  topic?: string;
  deviceId?: string;
}

export interface IAmqpPublishOptions {
  routingKey?: string;
  topic?: string;
  withConfirm?: boolean;
}

export type IAmqpCallback = (message: any, fields?: object, properties?: object) => Promise<void>|void;

export type IAmqpListener = {
  callback: IAmqpCallback;
  opts?: IAmqpConsumeOptions;
}

class AmqpClient extends SpaceBunny {
  private amqpConnection: amqp.Connection;

  private amqpChannels: { [key: string]: amqp.Channel };

  private defaultConnectionOpts: any;

  private ackTypes: string[];

  private connected: boolean;

  private amqpListeners: IAmqpListener[];

  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts: ISpaceBunnyParams = {}) {
    super(opts);
    this.amqpConnection = undefined;
    this.amqpChannels = {};
    this.protocol = 'amqp';
    this.tlsProtocol = 'amqps';
    this.defaultConnectionOpts = { frameMax: 32768 };
    this.ackTypes = ['auto', 'manual'];
    this.connected = false;
    this.amqpListeners = [];
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is received
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  public onReceive = async (callback: IAmqpCallback, opts: IAmqpConsumeOptions = {}): Promise<void> => {
    this.addAmqpListener(callback, opts);
    await this.bindAmqpListeners();
  }

  /**
   * Publish a message on a specific channel
   *
   * @param {String} channel - channel name on which you want to publish a message
   * @param {Object} message - the message payload
   * @param {Object} opts - publication options
   * @return promise containing the result of the subscription
   */
  public publish = async (channel: string, message: any, opts: IAmqpPublishOptions = {}, publishOpts: amqp.Options.Publish = {}): Promise<boolean> => {
    const { routingKey = undefined, topic = undefined, withConfirm = false } = opts;
    const ch: amqp.Channel | amqp.ConfirmChannel = await this.createChannel('output', { withConfirm });
    if (this.isConnected()) {
      try {
        const encapsulatedContent = encapsulateContent(message);
        const rKey = this.routingKeyFor({ channel, routingKey, topic });
        const deviceId = this.getDeviceId();
        await ch.checkExchange(deviceId);
        const res = ch.publish(deviceId, rKey, Buffer.from(encapsulatedContent), publishOpts);
        if (!res) {
          this.log('error', `Publish on channel ${channel} failed: ${encapsulatedContent}`);
          return false;
        }
        if (withConfirm === true && res) {
          await (ch as amqp.ConfirmChannel).waitForConfirms();
        }
        this.log('debug', `Message published on channel ${channel} successfully`);
        return true;
      } catch (error) {
        this.log('error', `Error publishing on channel ${channel}`);
        throw error;
      }
    } else {
      throw new Error(`${this.getClassName()} - Error sending message on channel ${channel} when client is not connected`);
    }
  }

  /**
   * Destroy the connection between the amqp client and broker
   *
   * @return a promise containing the result of the operation
   */
  public disconnect = async (): Promise<boolean> => {
    if (this.isConnected()) {
      try {
        const channels = Object.keys(this.amqpChannels);
        for (let index = 0; index < channels.length; index += 1) {
          const channelName = channels[index];
          if (this.amqpChannels[channelName]) {
            // eslint-disable-next-line no-await-in-loop
            await this.amqpChannels[channelName].close();
            delete this.amqpChannels[channelName];
          }
        }
        await this.amqpConnection.close();
      } catch (error) {
        this.log('error', 'Error disconnecting client.');
        throw error;
      }
    } else {
      this.log('info', 'Client already disconnected.');
    }
    this.emit('disconnect');
    this.amqpConnection = undefined;
    this.amqpChannels = {};
    this.amqpListeners = [];
    this.connected = false;
    return true;
  }

  /**
   * Establish an amqp connection with the broker
   * using configurations retrieved from the endpoint.
   * If the connnection already exists, returns the current connnection
   *
   * @return a promise containing current connection
   */
  public connect = async (opts: amqp.Options.Connect = {}, socketOptions: object = {}): Promise<amqp.Connection|void> => {
    if (this.isConnected()) { return this.amqpConnection; }
    await this.getEndpointConfigs();
    try {
      this.log('debug', 'Connecting client..');
      this.amqpConnection = await amqp.connect({
        protocol: (this.tls) ? this.tlsProtocol : this.protocol,
        hostname: this.connectionParams.host,
        port: (this.tls) ? this.connectionParams.protocols.amqp.tlsPort : this.connectionParams.protocols.amqp.port,
        username: this.connectionParams.deviceId || this.connectionParams.client,
        password: this.connectionParams.secret,
        vhost: this.connectionParams.vhost.replace('/', '%2f'),
        frameMax: opts.frameMax || this.defaultConnectionOpts.frameMax,
        heartbeat: opts.heartbeat || this.heartbeat
      }, {
        timeout: this.connectionTimeout,
        ...socketOptions
      });
      const onError = (err) => {
        if (err) {
          this.emit('close', err);
          this.log('error', err);
        }
        this.amqpConnection.removeAllListeners();
        this.amqpConnection = undefined;
        this.connected = false;
        this.connect(opts);
      };
      const onBlock = (reason) => {
        if (reason) {
          this.emit('blocked', reason);
          this.log('warn', reason);
        }
      };
      this.amqpConnection.on('error', onError);
      this.amqpConnection.on('close', onError);
      this.amqpConnection.on('blocked', onBlock);
      this.amqpConnection.on('unblocked', onBlock);
      this.connected = true;
      this.emit('connect');
      this.log('debug', 'Client connected!');
      await this.bindAmqpListeners();
      return this.amqpConnection;
    } catch (error) {
      if (!isNullOrUndefined(this.amqpConnection)) {
        this.amqpConnection.removeAllListeners();
        this.amqpConnection = undefined;
      }
      this.connected = false;
      this.log('error', 'Error during connection');
      if (this.autoReconnect) {
        this.log('error', error.message);
        this.connect(opts);
      } else {
        throw error;
      }
    }
  }

  public isConnected = (): boolean => {
    return (this.amqpConnection !== undefined) && this.connected;
  }

  // ------------ PRIVATE METHODS -------------------

  protected addAmqpListener = (callback: IAmqpCallback, opts: IAmqpConsumeOptions = {}): void => {
    this.amqpListeners.push({ callback, opts });
  }

  protected bindAmqpListeners = async (): Promise<void> => {
    for (let index = 0; index < this.amqpListeners.length; index += 1) {
      const { callback, opts } = this.amqpListeners[index];
      // Receive messages from input queue
      const noAck = isNullOrUndefined(opts.ack);
      const name = 'input';
      // eslint-disable-next-line no-await-in-loop
      const ch: amqp.Channel | amqp.ConfirmChannel = await this.createChannel(name, { withConfirm: false });
      try {
        // eslint-disable-next-line no-await-in-loop
        await ch.checkQueue(`${this.getDeviceId()}.${this.getInboxTopic()}`);
        // eslint-disable-next-line no-await-in-loop
        await ch.consume(`${this.getDeviceId()}.${this.getInboxTopic()}`,
          this.consumeCallback.bind(this, ch, callback, opts),
          { noAck });
      } catch (error) {
        this.log('error', `Error consuming from ${name} channel.`);
        throw error;
      }
    }
  }

  /**
   * Creates a channel on current connection
   *
   * @private
   * @param {String} channelName - indicates the channel name
   * @param {Object} opts - channel options
   * @return a promise containing the current channel
   */
  protected createChannel = async (channel: string, opts: { withConfirm?: boolean } = {}): Promise<amqp.Channel | amqp.ConfirmChannel> => {
    const { withConfirm = true } = opts;
    const channelName = `${channel}${(withConfirm === true) ? 'WithConfirm' : ''}`;
    if (this.isConnected()) {
      try {
        if (isNullOrUndefined(this.amqpChannels[channelName])) {
          this.amqpChannels[channelName] = (withConfirm === true || channelName.endsWith('WithConfirm')) ? await this.amqpConnection.createConfirmChannel()
            : await this.amqpConnection.createChannel();
          this.emit('channelOpen', channelName);
          const errorCallback = (err: Error) => {
            if (err) { this.log('error', err); }
            // TODO close channel in function of error type??
            this.amqpChannels[channelName].removeAllListeners();
            this.amqpChannels[channelName] = undefined;
          };
          this.amqpChannels[channelName].on('error', errorCallback);
          this.amqpChannels[channelName].on('close', errorCallback);
        }
        return this.amqpChannels[channelName];
      } catch (error) {
        this.log('error', `Error creating channel: ${channelName}`);
        throw error;
      }
    } else {
      throw new Error(`${this.getClassName()} - Error trying to open a channel on an invalid connection`);
    }
  }

  /**
   * Close a channel on current connection
   *
   * @private
   * @param {String} channelName - indicates if the channel is input or output
   * @return a promise containing the result of the operation
   */
  protected closeChannel = async (channelName: string, opts: { withConfirm?: boolean } = {}): Promise<void> => {
    try {
      const { withConfirm = true } = opts;
      const fullChannelName = `${channelName}${(withConfirm === true) ? 'WithConfirm' : ''}`;
      if (this.amqpChannels[fullChannelName]) {
        await this.amqpChannels[fullChannelName].close();
        this.amqpChannels[fullChannelName] = undefined;
      }
    } catch (error) {
      this.log('error', `Error closing channel ${channelName}`);
      throw error;
    }
  }

  protected consumeCallback = (ch: amqp.Channel | amqp.ConfirmChannel, callback: IAmqpCallback, opts: IAmqpConsumeOptions, message: amqp.ConsumeMessage): void => {
    try {
      const { ack = undefined, allUpTo = false, requeue = false } = opts;
      if (isNullOrUndefined(message)) { return; }
      // Create message object
      const { discardMine, discardFromApi } = opts;
      const amqpMessage = new AmqpMessage({
        message,
        receiverId: this.getClient(),
        channel: ch,
        subscriptionOpts: { discardMine, discardFromApi }
      });
      const ackNeeded = this.autoAck(ack);
      // Check if should be accepted or not
      if (amqpMessage.blackListed()) {
        if (ackNeeded) { amqpMessage.nack({ allUpTo, requeue }); }
        return;
      }
      // Call message callback
      callback(amqpMessage.getContent(), amqpMessage.getFields(), amqpMessage.getProperties());
      // Check if ACK is needed
      if (ackNeeded) { amqpMessage.ack({ allUpTo }); }
    } catch (error) {
      this.log('error', 'Error consuming message');
      this.log('error', error);
    }
  }

  /**
   * Generate the routing key for a specific channel
   *
   * @private
   * @param {Object} params - params
   * @return a string that represents the routing key for that channel
   */
  public routingKeyFor = (params: IRoutingKey = {}): string => {
    const { channel = undefined, routingKey = undefined, topic = undefined } = params;
    if (routingKey) { return routingKey; }
    let messageRoutingKey = this.getDeviceId();
    if (!isNullOrUndefined(channel) && channel.length > 0) {
      messageRoutingKey += `.${channel || ''}`;
    }
    if (!isNullOrUndefined(topic) && topic.length > 0) {
      messageRoutingKey += `.${topic || ''}`;
    }
    return messageRoutingKey;
  }

  /**
   * Check if the SDK have to automatically ack messages
   *
   * @private
   * @param {String} ack - the ack type, it should be 'manual' or 'auto'
   * @return boolean - true if messages have to be autoacked, false otherwise
   */
  protected autoAck = (ack: string|void): boolean => {
    if (ack) {
      if (!this.ackTypes.includes(ack)) {
        this.log('error', 'Wrong acknowledge type');
      }
      switch (ack) {
        case 'auto':
          return true;
        default:
          return false;
      }
    }
    return false;
  }
}

export default AmqpClient;
