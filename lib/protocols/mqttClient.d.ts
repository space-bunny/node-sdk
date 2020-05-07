/**
 * A module that exports an MqttClient client
 * which inherits from the SpaceBunny base client
 * @module MqttClient
 */
import mqtt, { AsyncMqttClient, QoS } from 'async-mqtt';
import SpaceBunny, { ISpaceBunnyParams } from '../spacebunny';
export declare type IMqttCallback = (topic?: string, message?: any) => Promise<void>;
export declare type IMqttListener = {
    callback: IMqttCallback;
    topics?: string[];
};
export declare type IMqttConnectionOptions = {
    qos?: QoS;
    clean?: boolean;
    reconnectPeriod?: number;
    keepalive?: number;
    connectTimeout?: number;
};
declare class MqttClient extends SpaceBunny {
    protected mqttClient: AsyncMqttClient;
    protected mqttListeners: {
        [name: string]: IMqttListener;
    };
    protected topics: string[];
    protected connectionOpts: IMqttConnectionOptions;
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
    onReceive: (callback: IMqttCallback, opts?: mqtt.IClientSubscribeOptions) => Promise<string | void>;
    /**
     * Publish a message on a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @param {Object/String} message - the message payload
     * @param {Object} opts - publication options
     * @return a promise containing the result of the operation
     */
    publish: (channel: string, message: any, opts?: mqtt.IClientPublishOptions) => Promise<any>;
    addMqttListener: (name: string, callback: IMqttCallback, topics?: string | string[]) => void;
    removeMqttListener: (name: string) => void;
    subscribe: (topics: string | string[], opts?: mqtt.IClientSubscribeOptions) => Promise<void>;
    /**
     * Unsubscribe client from a list of topics
     *
     * @param {Object} topics - list of topics { topic: qos, ... }
     * e.g. { topic_1: 1, topic_2: 0 }
     * @return a promise containing the result of the operation
     */
    unsubscribe(topics?: string | string[]): Promise<void>;
    /**
     * Destroy the connection between the mqtt client and broker
     *
     * @return a promise containing the result of the operation
     */
    disconnect(): Promise<void>;
    /**
     * Establish an mqtt connection with the broker.
     * If a connection already exists, returns the current connection
     *
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */
    connect: (opts?: mqtt.IClientOptions) => Promise<void | mqtt.AsyncMqttClient>;
    isConnected: () => boolean;
    /**
     * Generate the topic for a specific channel
     *
     * @private
     * @param {String} deviceId - device id
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */
    topicFor: (deviceId: string | void, channel: string) => string;
}
export default MqttClient;
