/**
 * A module that exports an StompClient client
 * which inherits from the SpaceBunny base client
 * @module StompClient
 */
import Stomp, { Client, IMessage, StompHeaders } from '@stomp/stompjs';
import StompMessage from '../messages/stompMessage';
import SpaceBunny, { ISpaceBunnySubscribeOptions } from '../spacebunny';
export interface IStompPublishOptions {
    routingKey?: string;
    topic?: string;
}
export interface IStompDestinationhOptions extends IStompPublishOptions {
    type?: string;
    channel?: string;
}
export interface IStompConsumeOptions extends ISpaceBunnySubscribeOptions {
    ack?: 'client';
}
export declare type IStompCallback = (message: StompMessage) => Promise<void> | void;
export declare type IStompListener = {
    callback: IStompCallback;
    topic: string;
    opts?: IStompConsumeOptions;
    subscription?: Stomp.StompSubscription;
};
declare class StompClient extends SpaceBunny {
    protected stompClient: Stomp.Client;
    protected stompListeners: {
        [name: string]: IStompListener;
    };
    protected connectionHeaders: StompHeaders;
    protected connectionOpts: any;
    protected existingQueuePrefix: string;
    protected defaultResource: string;
    protected ackTypes: string[];
    protected wsEndpoint: string;
    protected topics: string[];
    /**
     * @constructor
     * @param {Object} opts - options must contain Device-Key or connection options
     * (deviceId and secret) for devices.
     */
    constructor(opts?: any);
    /**
     * Subscribe to input channel
     *
     * @param {function} callback - function called every time a message is received
     * passing the current message as argument
     * @param {Object} options - subscription options
     * @return promise containing the result of the subscription
     */
    onMessage: (callback: IStompCallback, opts?: IStompConsumeOptions) => Promise<void>;
    /**
     * Publish a message on a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @param {Object} message - the message payload
     * @param {Object} opts - publication options
     * @return a promise containing the result of the operation
     */
    publish: (channel: string, message: Record<string, unknown>, opts?: IStompPublishOptions) => Promise<boolean>;
    /**
     * Destroy the connection between the stomp client and broker
     *
     * @return a promise containing the result of the operation
     */
    disconnect: () => Promise<boolean>;
    /**
     * Establish an stomp connection with the broker.
     * If a connection already exists, returns the current connection
     *
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */
    connect: (opts?: Stomp.StompConfig) => Promise<Stomp.Client>;
    isConnected: () => boolean;
    removeStompListener: (name: string) => void;
    protected consumeCallback: (callback: IStompCallback, opts: IStompConsumeOptions, message: IMessage) => void;
    private addStompListener;
    private bindStompListners;
    private bindStompListner;
    /**
     * Generate the subscription string for a specific channel
     *
     * @private
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */
    subcriptionFor: (type: string, channel: string) => string;
    /**
     * Generate the destination string for a specific channel
     *
     * @private
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */
    destinationFor: (params?: IStompDestinationhOptions) => string;
    /**
     * Check if the SDK have to automatically ack messages
     * By default STOMP messages are acked by the server
     * they need to be acked if client subscribes with { ack: 'client' } option
     *
     * @private
     * @param {String} ack - the ack type, it should be 'client' or null
     * @return boolean - true if messages have to be autoacked, false otherwise
     */
    protected autoAck: (ack: string) => boolean;
    private publishCachedMessages;
}
export default StompClient;
