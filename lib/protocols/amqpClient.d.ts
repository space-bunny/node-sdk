/**
 * A module that exports an AmqpClient client
 * which inherits from the SpaceBunny base client
 * @module AmqpClient
 */
import * as amqp from 'amqplib';
import SpaceBunny, { ISpaceBunnyParams, ISpaceBunnySubscribeOptions } from '../spacebunny';
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
declare class AmqpClient extends SpaceBunny {
    private amqpConnection;
    private amqpChannels;
    private defaultConnectionOpts;
    private ackTypes;
    private connected;
    /**
     * @constructor
     * @param {Object} opts - options must contain Device-Key or connection options
     * (deviceId and secret) for devices.
     */
    constructor(opts?: ISpaceBunnyParams);
    /**
     * Subscribe to input channel
     *
     * @param {function} callback - function called every time a message is received
     * passing the current message as argument
     * @param {Object} options - subscription options
     * @return promise containing the result of the subscription
     */
    onReceive: (callback: Function, opts?: IAmqpConsumeOptions) => Promise<void>;
    /**
     * Publish a message on a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @param {Object} message - the message payload
     * @param {Object} opts - publication options
     * @return promise containing the result of the subscription
     */
    publish: (channel: string, message: any, opts?: IAmqpPublishOptions, publishOpts?: amqp.Options.Publish) => Promise<void>;
    /**
     * Destroy the connection between the amqp client and broker
     *
     * @return a promise containing the result of the operation
     */
    disconnect: () => Promise<boolean>;
    /**
     * Establish an amqp connection with the broker
     * using configurations retrieved from the endpoint.
     * If the connnection already exists, returns the current connnection
     *
     * @return a promise containing current connection
     */
    connect: (opts?: amqp.Options.Connect) => Promise<void | amqp.Connection>;
    isConnected: () => boolean;
    /**
     * Creates a channel on current connection
     *
     * @private
     * @param {String} channelName - indicates the channel name
     * @param {Object} opts - channel options
     * @return a promise containing the current channel
     */
    protected createChannel: (channel: string, opts?: {
        withConfirm?: boolean;
    }) => Promise<void | amqp.Channel | amqp.ConfirmChannel>;
    /**
     * Close a channel on current connection
     *
     * @private
     * @param {String} channelName - indicates if the channel is input or output
     * @return a promise containing the result of the operation
     */
    protected closeChannel: (channelName: string, opts: {
        withConfirm?: boolean;
    }) => Promise<void>;
    /**
     * Generate the routing key for a specific channel
     *
     * @private
     * @param {Object} params - params
     * @return a string that represents the routing key for that channel
     */
    routingKeyFor: (params?: IRoutingKey) => string;
    /**
     * Check if the SDK have to automatically ack messages
     *
     * @private
     * @param {String} ack - the ack type, it should be 'manual' or 'auto'
     * @return boolean - true if messages have to be autoacked, false otherwise
     */
    protected autoAck: (ack: string | void) => boolean;
}
export default AmqpClient;
