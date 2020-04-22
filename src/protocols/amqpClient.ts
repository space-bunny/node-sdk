/**
 * A module that exports an AmqpClient client
 * which inherits from the SpaceBunny base client
 * @module AmqpClient
 */

// Import amqplib
import * as amqp from 'amqplib';
// Import some helpers modules
import { cloneDeep, isEmpty, isNil, merge, pick } from 'lodash';

import CONSTANTS from '../config/constants';
import AmqpMessage from '../messages/amqpMessage';
// Import SpaceBunny main module from which AmqpClient inherits
import SpaceBunny, { IConnectionParams, IEndpointConfigs } from '../spacebunny';
import { encapsulateContent } from '../utils';

export interface IAmqpConsumeOptions {
  allUpTo?: boolean;
  ack?: 'auto' | 'manual' | void;
  requeue?: boolean;
  discardMine?: boolean;
  discardFromApi?: boolean;
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
  withConfirm?: boolean
}

class AmqpClient extends SpaceBunny {
  private amqpConnection: amqp.Connection;

  private amqpChannels: { [key: string]: amqp.Channel };

  private tlsProtocol: string;

  private connectionOpts: any;

  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts: IConnectionParams = {}) {
    super(opts);
    this.amqpConnection = undefined;
    this.amqpChannels = {};
    const amqpOptions = CONSTANTS.amqp;
    this.protocol = amqpOptions.protocol;
    this.tlsProtocol = amqpOptions.tls.protocol;
    this.connectionOpts = amqpOptions.connection.opts;
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is received
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */
  public onReceive = async (callback: Function, opts: IAmqpConsumeOptions = {}): Promise<any[]> => {
    // Receive messages from imput queue
    const { ack = undefined, allUpTo = false, requeue = false } = opts;
    const noAck = isNil(ack);
    const ch: amqp.Channel | amqp.ConfirmChannel | void = await this.createChannel('input', { withConfirm: false });
    let promises = [];
    if (ch) {
      promises = [
        ch.checkQueue(`${this.getDeviceId()}.${this.getInboxTopic()}`),
        ch.consume(`${this.getDeviceId()}.${this.getInboxTopic()}`, (message: amqp.ConsumeMessage | null) => {
          if (isNil(message)) { return; }

          // Create message object
          const amqpMessage = new AmqpMessage({
            message,
            receiverId: this.getDeviceId(),
            channel: ch,
            subscriptionOpts: pick(opts, ['discardMine', 'discardFromApi'])
          });
          const ackNeeded = this.autoAck(ack);
          // Check if should be accepted or not
          if (amqpMessage.blackListed()) {
            if (ackNeeded) { ch.nack(message, allUpTo, requeue); }
            return;
          }
          // Call message callback
          callback(amqpMessage.getContent(), amqpMessage.getFields(), amqpMessage.getProperties());
          // Check if ACK is needed
          if (ackNeeded) { ch.ack(message, allUpTo); }
        }, { noAck })
      ];
    }
    return Promise.all(promises);
  }

  /**
   * Publish a message on a specific channel
   *
   * @param {String} channel - channel name on which you want to publish a message
   * @param {Object} message - the message payload
   * @param {Object} opts - publication options
   * @return promise containing the result of the subscription
   */
  public publish = async (channel: string, message: any, opts: IAmqpPublishOptions = {}, publishOpts: amqp.Options.Publish = {}): Promise<void> => {
    const { routingKey = undefined, topic = undefined, withConfirm = false } = opts;
    const ch: amqp.Channel | amqp.ConfirmChannel | void = await this.createChannel('output', { withConfirm });
    if (ch) {
      try {
        const encapsulatedContent = encapsulateContent(message);
        const rKey = this.routingKeyFor({ channel, routingKey, topic });
        const deviceId = this.getDeviceId();
        await ch.checkExchange(deviceId);
        const res = ch.publish(deviceId, rKey, Buffer.from(encapsulatedContent), publishOpts);
        if (withConfirm === true && res) {
          await (ch as amqp.ConfirmChannel).waitForConfirms();
        }
        if (!res) {
          this.log('error', `Error publishing message ${encapsulatedContent}`);
        }
      } catch (error) {
        this.log('error', error);
      }
    } else {
      this.log('error', 'Trying to publish on a closed channel');
    }
  }

  /**
   * Destroy the connection between the amqp client and broker
   *
   * @return a promise containing the result of the operation
   */
  public disconnect = async (): Promise<void> => {
    if (this.amqpConnection) {
      const channels = Object.keys(this.amqpChannels);
      for (let index = 0; index < channels.length; index += 1) {
        const channelName = channels[index];
        // eslint-disable-next-line no-await-in-loop
        await this.amqpChannels[channelName].close();
        delete this.amqpChannels[channelName];
      }
      await this.amqpConnection.close();
      this.emit('disconnect');
      this.amqpConnection = undefined;
      this.amqpChannels = {};
    }
  }

  /**
   * Establish an amqp connection with the broker
   * using configurations retrieved from the endpoint.
   * If the connnection already exists, returns the current connnection
   *
   * @return a promise containing current connection
   */
  public connect = async (opts: amqp.Options.Connect = {}): Promise<amqp.Connection> => {
    let connectionOpts = cloneDeep(opts);
    connectionOpts = merge(cloneDeep(this.connectionOpts), connectionOpts);
    const endpointConfigs: IEndpointConfigs = await this.getEndpointConfigs();
    const connectionParams = (endpointConfigs) ? endpointConfigs.connection : {};
    if (this.isConnected()) {
      return this.amqpConnection;
    }
    let connectionString = '';
    if (this.tls) {
      connectionString = `${this.tlsProtocol}://${connectionParams.deviceId || connectionParams.client}:`
        + `${connectionParams.secret}@${connectionParams.host}:`
        + `${connectionParams.protocols.amqp.tlsPort}/${connectionParams.vhost.replace('/', '%2f')}`;
      connectionOpts = merge(connectionOpts, this.tlsOpts);
    } else {
      connectionString = `${this.protocol}://${connectionParams.deviceId || connectionParams.client}:`
        + `${connectionParams.secret}@${connectionParams.host}:`
        + `${connectionParams.protocols.amqp.port}/${connectionParams.vhost.replace('/', '%2f')}`;
    }
    this.amqpConnection = await amqp.connect(connectionString, connectionOpts);
    this.amqpConnection.on('error', (err) => {
      this.amqpConnection = undefined;
      this.emit('error', err);
      this.log('error', err);
    });
    this.amqpConnection.on('close', (err) => {
      this.amqpConnection = undefined;
      this.emit('close', err);
      this.log('error', err);
    });
    this.amqpConnection.on('blocked', (reason) => {
      this.emit('blocked', reason);
      this.log('warn', reason);
    });
    this.amqpConnection.on('unblocked', (reason) => {
      this.emit('unblocked', reason);
      this.log('warn', reason);
    });

    this.emit('connect');
    return this.amqpConnection;
  }

  public isConnected = (): boolean => {
    return (this.amqpConnection !== undefined);
  }

  // ------------ PRIVATE METHODS -------------------

  /**
   * Creates a channel on current connection
   *
   * @private
   * @param {String} channelName - indicates the channel name
   * @param {Object} opts - channel options
   * @return a promise containing the current channel
   */
  protected createChannel = async (channel: string, opts: { withConfirm?: boolean } = {}): Promise<amqp.Channel | amqp.ConfirmChannel | void> => {
    const { withConfirm = true } = opts;
    const channelName = `${channel}${(withConfirm === true) ? 'WithConfirm' : ''}`;
    if (this.amqpConnection) {
      try {
        if (isNil(this.amqpChannels[channelName])) {
          this.amqpChannels[channelName] = (withConfirm === true) ? await this.amqpConnection.createConfirmChannel()
            : await this.amqpConnection.createChannel();
          this.emit('channelOpen', channelName);
          const errorCallback = (err: Error) => {
            if (err) { this.log('error', err); }
            // TODO close channel in function of error type??
            this.amqpChannels[channelName] = undefined;
          };
          this.amqpChannels[channelName].on('error', errorCallback);
          this.amqpChannels[channelName].on('close', errorCallback);
        }
        return this.amqpChannels[channelName];
      } catch (error) {
        this.log('error', error);
      }
    } else {
      this.log('error', new Error('Trying to open a channel on an empty connection'));
    }
  }

  /**
   * Close a channel on current connection
   *
   * @private
   * @param {String} channelName - indicates if the channel is input or output
   * @return a promise containing the result of the operation
   */
  protected closeChannel = async (channelName: string, opts: { withConfirm?: boolean }): Promise<void> => {
    try {
      const { withConfirm = true } = opts;
      const fullChannelName = `${channelName}${(withConfirm === true) ? 'WithConfirm' : ''}`;
      if (this.amqpChannels[fullChannelName]) {
        await this.amqpChannels[fullChannelName].close();
        this.amqpChannels[fullChannelName] = undefined;
      }
    } catch (error) {
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
    if (!isEmpty(channel)) {
      messageRoutingKey += `.${channel || ''}`;
    }
    if (!isEmpty(topic)) {
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
      if (!CONSTANTS[this.protocol].ackTypes.includes(ack)) {
        this.log('error', 'Wrong acknowledge type');
      }
      switch (ack) {
        case 'auto':
          return true;
        default:
          return false;
      }
    }
    return true;
  }
}

export default AmqpClient;
