/**
 * A module that exports an MqttStreamClient client
 * which inherits from the Mqtt base client
 * @module MqttStreamClient
 */
import { IClientSubscribeOptions, QoS } from 'async-mqtt';
import { ILiveStreamHook } from '../spacebunny';
import MqttClient from './mqttClient';
export declare type IMqttCallback = (topic?: string, message?: any) => Promise<void> | void;
export interface IMqttLiveStreamHook extends ILiveStreamHook {
    callback: IMqttCallback;
    qos?: QoS;
}
declare class MqttStreamClient extends MqttClient {
    private defaultStreamRoutingKey;
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
    streamFrom: (streamHooks?: IMqttLiveStreamHook | Array<IMqttLiveStreamHook>, opts?: IClientSubscribeOptions) => Promise<Array<string | void>>;
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
    addStreamHook: (streamHook: IMqttLiveStreamHook, opts?: IClientSubscribeOptions) => Promise<string | void>;
    /**
     * Generate the topic for a specific channel
     *
     * @private
     * @param {String} deviceId - deviceId from which you want to stream
     * @param {String} channel - channel name from which you want to stream
     * @return a string that represents the topic name for that channel
     */
    private streamChannelTopicFor;
    /**
     * Generate the topic for a specific stream
     *
     * @private
     * @param {String} streamName - stream name from which you want to stream
     * @return a string that represents the topic name for that stream
     */
    streamTopicFor: (stream?: string) => string;
}
export default MqttStreamClient;
