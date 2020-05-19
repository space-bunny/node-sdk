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
export declare type IAmqpCallback = (message: any, fields?: object, properties?: object) => Promise<void> | void;
export declare type IAmqpListener = {
    callback: IAmqpCallback;
    opts?: IAmqpConsumeOptions;
    consumerTag?: string;
};
declare class AmqpClient extends SpaceBunny {
    private amqpConnection;
    private amqpChannels;
    private defaultConnectionOpts;
    private ackTypes;
    private connected;
    private amqpListeners;
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
    onMessage: (callback: IAmqpCallback, opts?: IAmqpConsumeOptions) => Promise<string>;
    /**
     * Publish a message on a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @param {Object} message - the message payload
     * @param {Object} opts - publication options
     * @return promise containing the result of the subscription
     */
    publish: (channel: string, message: any, opts?: IAmqpPublishOptions, publishOpts?: amqp.Options.Publish) => Promise<boolean>;
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
    connect: (opts?: amqp.Options.Connect, socketOptions?: object) => Promise<amqp.Connection | void>;
    isConnected: () => boolean;
    removeAmqpListener: (name: string) => Promise<void>;
    /**
    * Unsubscribe client from a topic
    *
    * @param {String} consumerTag - Consumer Tag
    * @return a promise containing the result of the operation
    */
    protected unsubscribe: (consumerTag: string) => Promise<void>;
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
    }) => Promise<amqp.Channel | amqp.ConfirmChannel>;
    /**
     * Close a channel on current connection
     *
     * @private
     * @param {String} channelName - indicates if the channel is input or output
     * @return a promise containing the result of the operation
     */
    protected closeChannel: (channelName: string, opts?: {
        withConfirm?: boolean;
    }) => Promise<void>;
    protected consumeCallback: (ch: amqp.Channel | amqp.ConfirmChannel, callback: IAmqpCallback, opts: IAmqpConsumeOptions, message: amqp.ConsumeMessage) => void;
    private clearConsumers;
    private addAmqpListener;
    private bindAmqpListeners;
    private bindAmqpListener;
    /**
     * Generate the routing key for a specific channel
     *
     * @private
     * @param {Object} params - params
     * @return a string that represents the routing key for that channel
     */
    private routingKeyFor;
    /**
     * Check if the SDK have to automatically ack messages
     *
     * @private
     * @param {String} ack - the ack type, it should be 'manual' or 'auto'
     * @return boolean - true if messages have to be autoacked, false otherwise
     */
    protected autoAck: (ack: string | void) => boolean;
    private publishCachedMessages;
}
export default AmqpClient;
