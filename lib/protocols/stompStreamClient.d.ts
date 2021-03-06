/**
 * A module that exports an StompStreamClient client
 * which inherits from the Stomp base client
 * @module StompStreamClient
 */
import Stomp from '@stomp/stompjs';
import StompMessage from '../messages/stompMessage';
import { ILiveStreamHook } from '../spacebunny';
import StompClient, { IStompConsumeOptions } from './stompClient';
export declare type IStompCallback = (message: StompMessage) => Promise<void>;
export interface IStompLiveStreamHook extends ILiveStreamHook {
    callback: IStompCallback;
    ack?: 'client';
}
export interface IStompLiveStreamDestination extends ILiveStreamHook {
    type?: string;
}
export declare type IStompStreamListener = {
    streamHook: IStompLiveStreamHook;
    opts?: IStompConsumeOptions;
    subscription?: Stomp.StompSubscription;
};
declare class StompStreamClient extends StompClient {
    private defaultPattern;
    private stompStreamListeners;
    /**
     * @constructor
     * @param {Object} opts - options must contain client and secret for access keys
     */
    constructor(opts?: any);
    /**
     * Subscribe to multiple stream hooks
     *
     * @param {Array} streamHooks - Array of objects. Each objects containing
     * { deviceId: {string}, channel: {string}, callback: {func} }
     * @param {Object} options - subscription options
     * @return promise containing the result of multiple subscriptions
     */
    streamFrom: (streamHooks?: IStompLiveStreamHook | Array<IStompLiveStreamHook>, opts?: any) => Promise<Array<string | void>>;
    removeStompStreamListener: (name: string) => Promise<void>;
    /**
   * Destroy the connection between the stomp client and broker
   *
   * @return a promise containing the result of the operation
   */
    disconnect: () => Promise<any>;
    /**
     * Unsubscribe client from a topic
     *
     * @param {String} subscriptionId - subscription ID
     * @return a promise containing the result of the operation
     */
    private unsubscribe;
    private addStompStreamListener;
    private bindStompStreamListeners;
    /**
     * Start consuming messages from a device's channel
     * It generates an auto delete queue from which consume
     * and binds it to the channel exchange
     *
     * @private
     * @param {Object} streamHook - Object containit hook info
     * { deviceId: {String}, channel: {String}, callback: {func}}
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */
    bindStompStreamListener: (name: string) => Promise<string | void>;
    /**
     * Generate the subscription string for a specific channel
     *
     * @private
     * @param {String} deviceId - deviceId from which you want to stream from
     * @param {String} channel - channel name from which you want to stream from
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} routingKey - binding pattern
     * @return a string that represents the topic name for that channel
     */
    streamChannelTopicFor: (params?: IStompLiveStreamDestination) => string;
    /**
     * Generate the subscription string for cached live streams
     *
     * @private
     * @param {String} stream - stream name from which you want to stream
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @return a string that represents the topic name for that channel
     */
    private cachedStreamTopicFor;
    /**
     * Generate the subscription for live streams without caching
     *
     * @private
     * @param {String} stream - stream name from which you want to stream
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} routingKey - binding pattern
     * @return a string that represents the topic name for that channel
     */
    streamTopicFor: (params?: IStompLiveStreamDestination) => string;
}
export default StompStreamClient;
