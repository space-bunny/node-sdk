/**
 * A module that exports an AmqpClient client
 * which inherits from the SpaceBunny base client
 * @module AmqpClient
 */

// Import amqplib
import * as amqp from 'amqplib';
import cloneDeep from 'lodash.clonedeep';
// Import some helpers modules
import { isDeepStrictEqual, isNullOrUndefined, promisify } from 'util';

import AmqpMessage from '../messages/amqpMessage';
// Import SpaceBunny main module from which AmqpClient inherits
import SpaceBunny, {
  ICachedMessage, ISpaceBunnyParams, ISpaceBunnySubscribeOptions
} from '../spacebunny';
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

export type IAmqpCallback = (message: Record<string, unknown>|string, fields?: amqp.MessageFields, properties?: amqp.MessageProperties) => Promise<void>|void;

export type IAmqpListener = {
  callback: IAmqpCallback;
  opts?: IAmqpConsumeOptions;
  consumerTag?: string;
}

class AmqpClient extends SpaceBunny {
  private amqpConnection: amqp.Connection;

  private amqpChannels: { [key: string]: amqp.Channel };

  private defaultConnectionOpts: Record<string, unknown>;

  private ackTypes: string[];

  private connected: boolean;

  private amqpListeners: { [name: string]: IAmqpListener };

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
    this.amqpListeners = {};
    this.on('connect', () => {
      void this.bindAmqpListeners();
      void this.publishCachedMessages();
    });
    this.on('disconnect', () => { this.amqpListeners = {}; });
    this.on('channelClose', () => { this.clearConsumers(); });
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is received
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  public onMessage = async (callback: IAmqpCallback, opts: IAmqpConsumeOptions = {}): Promise<string> => {
    const name = this.addAmqpListener(callback, opts);
    await this.bindAmqpListener(name);
    return name;
  }

  /**
   * Publish a message on a specific channel
   *
   * @param {String} channel - channel name on which you want to publish a message
   * @param {Object} message - the message payload
   * @param {Object} opts - publication options
   * @return promise containing the result of the subscription
   */
  public publish = async (channel: string, message: Record<string, unknown>, opts: IAmqpPublishOptions = {}, publishOpts: amqp.Options.Publish = {}): Promise<boolean> => {
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
        this.amqpConnection.removeAllListeners();
        await this.amqpConnection.close();
      } catch (error) {
        this.log('error', 'Error disconnecting client.');
        throw error;
      }
    } else {
      this.log('info', 'Client already disconnected.');
    }
    this.amqpConnection = undefined;
    this.amqpChannels = {};
    this.connected = false;
    this.emit('disconnect');
    return true;
  }

  /**
   * Establish an amqp connection with the broker
   * using configurations retrieved from the endpoint.
   * If the connnection already exists, returns the current connnection
   *
   * @return a promise containing current connection
   */
  public connect = async (opts: amqp.Options.Connect = {}, socketOptions: Record<string, unknown> = {}): Promise<amqp.Connection|void> => {
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
        frameMax: opts.frameMax || (this.defaultConnectionOpts.frameMax as number),
        heartbeat: opts.heartbeat || this.heartbeat
      }, {
        timeout: this.connectionTimeout,
        ...socketOptions
      });
      const onError = (err: Error) => {
        if (err) {
          this.emit('error', err);
          this.log('error', err);
        }
        if (!isNullOrUndefined(this.amqpConnection)) {
          this.amqpConnection.removeAllListeners();
          this.amqpConnection = undefined;
        }
        this.connected = false;
        if (this.autoReconnect) {
          void this.connect(opts);
        }
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
      return this.amqpConnection;
    } catch (error) {
      if (!isNullOrUndefined(this.amqpConnection)) {
        this.amqpConnection.removeAllListeners();
        this.amqpConnection = undefined;
      }
      this.connected = false;
      this.log('error', 'Error during connection');
      if (this.autoReconnect) {
        this.log('error', (error as Error).message);
        const timeout = promisify(setTimeout);
        await timeout(this.reconnectTimeout);
        void this.connect(opts);
      } else {
        throw error;
      }
    }
  }

  public isConnected = (): boolean => {
    return (this.amqpConnection !== undefined) && this.connected;
  }

  public removeAmqpListener = async (name: string): Promise<void> => {
    if (isNullOrUndefined(this.amqpListeners[name])) {
      this.log('error', `AMQP listener ${name} does not exist.`);
      return;
    }
    await this.unsubscribe(this.amqpListeners[name].consumerTag);
    delete this.amqpListeners[name];
  }

  // ------------ PROTECTED METHODS -------------------

  /**
  * Unsubscribe client from a topic
  *
  * @param {String} consumerTag - Consumer Tag
  * @return a promise containing the result of the operation
  */
  protected unsubscribe = async (consumerTag: string): Promise<void> => {
    if (this.isConnected()) {
      try {
        const ch: amqp.Channel | amqp.ConfirmChannel | void = await this.createChannel('input');
        if (ch) {
          await ch.cancel(consumerTag);
        }
        this.log('debug', `Unsubscrbed ${consumerTag}`);
      } catch (error) {
        this.log('error', `Error unsubscribing from ${consumerTag}`);
        throw error;
      }
    } else {
      throw new Error(`${this.getClassName()} - Error trying to unsucscribe from ${consumerTag} on an invalid connection`);
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
            if (!isNullOrUndefined(this.amqpChannels[channelName])) {
              this.amqpChannels[channelName].removeAllListeners();
              this.amqpChannels[channelName] = undefined;
            }
            // emit channelClose to clear consumers
            if (channel.startsWith('input')) {
              this.emit('channelClose', channelName);
            }
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
      // Create message Record<string, unknown>
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
      void callback(amqpMessage.getContent(), amqpMessage.getFields(), amqpMessage.getProperties());
      // Check if ACK is needed
      if (ackNeeded) { amqpMessage.ack({ allUpTo }); }
    } catch (error) {
      this.log('error', 'Error consuming message');
      this.log('error', error);
    }
  }

  // ------------ PRIVATE METHODS -------------------

  private clearConsumers = (): void => {
    const names = Object.keys(this.amqpListeners);
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      const listener = this.amqpListeners[name];
      delete listener.consumerTag;
    }
  }

  private addAmqpListener = (callback: IAmqpCallback, opts: IAmqpConsumeOptions = {}): string => {
    const name = `subscription-${new Date().getTime()}`;
    this.amqpListeners[name] = { callback, opts };
    return name;
  }

  private bindAmqpListeners = async (): Promise<void> => {
    const names = Object.keys(this.amqpListeners);
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      // eslint-disable-next-line no-await-in-loop
      await this.bindAmqpListener(name);
    }
  }

  private bindAmqpListener = async (name: string): Promise<void> => {
    if (isNullOrUndefined(this.amqpListeners[name])) {
      this.log('error', `Listner ${name} does not exist.`);
      return;
    }
    if (!isNullOrUndefined(this.amqpListeners[name].consumerTag)) {
      this.log('warn', `Listner ${name} already bound to a consumer.`);
      return;
    }
    const { callback, opts } = this.amqpListeners[name];
    // Receive messages from input queue
    const noAck = isNullOrUndefined(opts.ack);
    const channelName = 'input';
    // eslint-disable-next-line no-await-in-loop
    const ch: amqp.Channel | amqp.ConfirmChannel = await this.createChannel(channelName, { withConfirm: false });
    try {
      // eslint-disable-next-line no-await-in-loop
      await ch.checkQueue(`${this.getDeviceId()}.${this.getInboxTopic()}`);
      // eslint-disable-next-line no-await-in-loop
      const { consumerTag } = await ch.consume(`${this.getDeviceId()}.${this.getInboxTopic()}`,
        this.consumeCallback.bind(this, ch, callback, opts),
        { noAck });
      this.amqpListeners[name].consumerTag = consumerTag;
    } catch (error) {
      this.log('error', `Error consuming from ${channelName} channel.`);
      throw error;
    }
  }

  /**
   * Generate the routing key for a specific channel
   *
   * @private
   * @param {Object} params - params
   * @return a string that represents the routing key for that channel
   */
  private routingKeyFor = (params: IRoutingKey = {}): string => {
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

  private publishCachedMessages = async () => {
    if (this.isConnected() && this.cachedMessages.length > 0) {
      const cachedMessagesToSend = cloneDeep(this.cachedMessages);
      this.log('debug', `Publishing ${cachedMessagesToSend.length} cached messages...`);
      for (let index = 0; index < cachedMessagesToSend.length; index += 1) {
        const cachedMessage: ICachedMessage = cachedMessagesToSend[index];
        this.log('silly', `Sending message ${index + 1} from cache`);
        const { message, channel, options } = cachedMessage;
        // eslint-disable-next-line no-await-in-loop
        const res: boolean = await this.publish(channel, message, options);
        if (res) {
          // remove message from cache when successful send
          const itemToRemove = this.cachedMessages.findIndex((el: ICachedMessage) => {
            return isDeepStrictEqual(el, cachedMessage);
          });
          this.cachedMessages.splice(itemToRemove, 1);
        }
      }
      this.writeCachedMessagesFile();
    }
  }
}

export default AmqpClient;
