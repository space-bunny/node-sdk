/**
 * A module that exports an AmqpStreamClient client
 * which inherits from the Amqp base client
 * @module AmqpStreamClient
 */
import { ILiveStreamHook, ISpaceBunnyParams } from '../spacebunny';
import AmqpClient, { IAmqpCallback, IAmqpConsumeOptions } from './amqpClient';
export interface IAmqpLiveStreamHook extends ILiveStreamHook {
    callback: IAmqpCallback;
}
declare class AmqpStreamClient extends AmqpClient {
    private defaultStreamRoutingKey;
    private streamQueueArguments;
    private subscriptions;
    /**
     * @constructor
     * @param {ISpaceBunnyParams} opts - options must contain client and secret for access keys
     */
    constructor(opts?: ISpaceBunnyParams);
    /**
     * Subscribe to multiple stream hooks
     *
     * @param {Array} streamHooks - Array of objects. Each objects containing
     * { name: {string}, deviceId: {string}, channel: {string}, callback: {func} }
     * @param {Object} options - subscription options
     * @return promise containing the result of multiple subscriptions
     */
    streamFrom: (streamHooks?: Array<IAmqpLiveStreamHook>, opts?: IAmqpConsumeOptions) => Promise<Array<string | void>>;
    /**
     * Start consuming messages from a device's channel
     * It generates an auto delete queue from which consume
     * and binds it to the channel exchange
     *
     * @private
     * @param {Object} streamHook - Object containit hook info
     * { stream: {String}, callback: {func}}
     * or
     * { deviceId: {String}, channel: {String}, callback: {func}}
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */
    addStreamHook: (streamHook: IAmqpLiveStreamHook, opts?: IAmqpConsumeOptions) => Promise<string>;
    /**
     * Unsubscribe client from a topic
     *
     * @param {String} consumerTag - Consumer Tag
     * @return a promise containing the result of the operation
     */
    unsubscribe: (consumerTag: string) => Promise<void>;
    /**
     * Generate the exchange name for a device's channel
     *
     * @private
     * @param {String} streamName - stream name from which you want to stream
     * @return a string that represents the stream queue
     */
    private cachedStreamQueue;
    /**
     * Generate the exchange name for a device's channel
     *
     * @private
     * @param {Object} opts - opts
     * @return a string that represents the rounting key
     */
    private streamRoutingKeyFor;
}
export default AmqpStreamClient;
