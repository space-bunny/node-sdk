import * as amqp from 'amqplib';
import { EventEmitter } from 'events';
import { MqttClient as MqttClient$1, IClientSubscribeOptions, IClientPublishOptions, IClientOptions } from 'mqtt';
import { QoS } from 'mqtt-packet';
import Stomp, { IMessage, StompHeaders } from '@stomp/stompjs';

/**
 * A module that exports the base SpaceBunny client
 * @module SpaceBunny
 */

interface ISpaceBunnyParams {
    endpoint?: IEndpoint;
    deviceKey?: string;
    channels?: IChannel[];
    deviceId?: string;
    client?: string;
    secret?: string;
    host?: string;
    port?: number;
    vhost?: string;
    protocol?: string;
    inboxTopic?: string;
    cert?: string;
    key?: string;
    passphrase?: string;
    ca?: string;
    pfx?: string;
    disableCertCheck?: boolean;
    secureProtocol?: string;
    tls?: boolean;
    protocols?: {
        [key: string]: IProtocol;
    };
    autoReconnect?: boolean;
    reconnectTimeout?: number;
    verbose?: boolean;
    caching?: boolean;
    cacheSize?: number;
    heartbeat?: number;
    connectionTimeout?: number;
    cachedMessagesPath?: string;
}
interface IEndpointConfigs {
    connection?: ISpaceBunnyParams;
    liveStreams?: ILiveStream[];
    channels?: IChannel[];
}
interface ITlsOptions {
    cert?: Buffer;
    key?: Buffer;
    passphrase?: string;
    ca?: Buffer[];
    rejectUnauthorized?: boolean;
    pfx?: Buffer;
}
interface IProtocol {
    port?: number;
    tlsPort?: number;
}
interface ILiveStream {
    name: string;
}
interface IChannel {
    name: string;
}
interface IEndpoint {
    protocol?: string;
    secureProtocol?: string;
    host?: string;
    port?: number;
    securePort?: number;
    deviceConfigurationsPath?: string;
    liveStreamKeyConfigurationsPath?: string;
    url?: string;
}
interface ILiveStreamHook {
    stream?: string;
    deviceId?: string;
    channel?: string;
    routingKey?: string;
    topic?: string;
    cache?: boolean;
}
interface ISpaceBunnySubscribeOptions {
    discardMine?: boolean;
    discardFromApi?: boolean;
}
interface ICachedMessage {
    message: Record<string, unknown>;
    channel: string;
    options?: Record<string, unknown>;
}
/**
 * @constructor
 * @param {Object} opts - constructor options may contain Device-Key or connection options
 */
declare class SpaceBunny extends EventEmitter {
    protected connectionParams: ISpaceBunnyParams;
    protected endpointConfigs: IEndpointConfigs;
    protected endpoint: IEndpoint;
    protected deviceKey: string | undefined;
    protected channels: IChannel[] | undefined;
    protected deviceId: string | undefined;
    protected client: string | undefined;
    protected secret: string | undefined;
    protected host: string | undefined;
    protected port: number | undefined;
    protected vhost: string | undefined;
    protected protocol: string;
    protected tlsProtocol: string;
    protected inboxTopic: string;
    protected liveStreamSuffix: string;
    protected tempQueueSuffix: string;
    protected liveStreams: ILiveStream[];
    protected tls: boolean;
    protected tlsOpts: ITlsOptions;
    protected autoReconnect: boolean;
    protected reconnectTimeout: number;
    protected verbose: boolean;
    protected cacheSize: number;
    protected connectionTimeout: number;
    protected heartbeat: number;
    protected manualConfigurations: boolean;
    protected caching: boolean;
    protected cachedMessagesPath: string | undefined;
    protected cachedMessages: ICachedMessage[];
    protected static DEFAULT_CONNECTION_TIMEOUT: number;
    protected static DEFAULT_RECONNECT_TIMEOUT: number;
    protected static DEFAULT_HEARTBEAT: number;
    protected static DEFAULT_CACHE_SIZE: number;
    private static subscriptionCounter;
    protected static generateSubscriptionName(): string;
    constructor(opts?: ISpaceBunnyParams);
    /**
     * Check if Device-Key or connection parameters have already been passed
     * If at least Device-Key is passed ask the endpoint for the configurations
     * else if also connection parameters are not passed raise an exception
     *
     * @return an Object containing the connection parameters
     */
    protected getEndpointConfigs: () => Promise<IEndpointConfigs>;
    protected getClassName: () => string;
    protected log: (level: string, message: string | Error, ...meta: any) => void;
    isConnected: () => boolean;
    isStreamClient: () => boolean;
    /**
     * @return all channels configured for the current device
     */
    getChannels: () => IChannel[];
    /**
     * @return the device ID for the current device
     */
    getDeviceId: () => string | undefined;
    /**
     * @return the client for the current stream
     */
    getClient: () => string | undefined;
    /**
     * @return the Inbox topic for the current device
     */
    getInboxTopic: () => string;
    /**
     * Return a Stream ID from a stream name given in input
     *
     * @param {String} streamName - stream name
     * @return the stream ID which corresponds to the input stream name
     */
    protected liveStreamByName: (streamName: string) => string;
    /**
     * Check if a stream exists
     *
     * @param {String} streamName - stream name
     * @return true if stream exists, false otherwise
     */
    protected liveStreamExists: (streamName: string) => boolean;
    /**
     * Generate a temporary queue name
     *
     * @private
     * @param {String} prefix - client id or stream name
     * @param {String} suffix - channel name or defaul live stream suffix
     * @param {Numeric} currentTime - current timestamp
     * @return a string that represents the topic name for that channel
     */
    protected tempQueue: (prefix: string, suffix: string, currentTime?: number | void) => string;
    /**
     * Generate the exchange name for a device's channel
     *
     * @private
     * @param {String} prefix - It could be a device id or a stream name
     * @param {String} suffix - It could be a channel name or a the default stream suffix (livestream)
     * @return a string that represents the complete exchange name
     */
    protected exchangeName: (prefix: string, suffix: string) => string;
    /**
     * Generate the complete hostname string for an endpoint
     *
     * @private
     * @return the string representing the endpoint url
     */
    private generateHostname;
    private loadCachedMessages;
    protected writeCachedMessagesFile: () => void;
    protected cacheMessage: (channel: string, message: Record<string, unknown>, options: Record<string, unknown>) => void;
}

/**
 * A module that exports an AmqpClient client
 * which inherits from the SpaceBunny base client
 * @module AmqpClient
 */

interface IAmqpConsumeOptions extends ISpaceBunnySubscribeOptions {
    allUpTo?: boolean;
    ack?: 'auto' | 'manual' | void;
    requeue?: boolean;
}
interface IAmqpPublishOptions {
    routingKey?: string;
    topic?: string;
    withConfirm?: boolean;
}
type IAmqpCallback = (message: Record<string, unknown> | string, fields?: amqp.MessageFields, properties?: amqp.MessageProperties) => Promise<void> | void;
declare class AmqpClient extends SpaceBunny {
    private amqpConnection;
    private amqpChannels;
    private defaultConnectionOpts;
    private ackTypes;
    private connected;
    private reconnecting;
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
    publish: (channel: string, message: Record<string, unknown>, opts?: IAmqpPublishOptions, publishOpts?: amqp.Options.Publish) => Promise<boolean>;
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
    connect: (opts?: amqp.Options.Connect, socketOptions?: Record<string, unknown>) => Promise<amqp.ChannelModel | void>;
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
    protected consumeCallback: (ch: amqp.Channel | amqp.ConfirmChannel, callback: IAmqpCallback, opts: IAmqpConsumeOptions | undefined, message: amqp.ConsumeMessage | null) => void;
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

/**
 * A module that exports an AmqpStreamClient client
 * which inherits from the Amqp base client
 * @module AmqpStreamClient
 */

interface IAmqpLiveStreamHook extends ILiveStreamHook {
    callback: IAmqpCallback;
}
declare class AmqpStreamClient extends AmqpClient {
    private defaultStreamRoutingKey;
    private streamQueueArguments;
    private amqpStreamListeners;
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
    streamFrom: (streamHooks?: IAmqpLiveStreamHook | Array<IAmqpLiveStreamHook>, opts?: IAmqpConsumeOptions) => Promise<Array<string | void>>;
    removeAmqpStreamListener: (name: string) => Promise<void>;
    private clearStreamConsumers;
    private addAmqpStreamListener;
    private bindAmqpStreamListeners;
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
    private bindAmqpStreamListener;
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

/**
 * A module that exports an MqttClient client
 * which inherits from the SpaceBunny base client
 * @module MqttClient
 */

type IMqttCallback$1 = (topic?: string, message?: any) => Promise<void> | void;
type IMqttListener = {
    callback: IMqttCallback$1;
    topics?: string[];
};
type IMqttConnectionOptions = {
    qos?: QoS;
    clean?: boolean;
    reconnectPeriod?: number;
    keepalive?: number;
    connectTimeout?: number;
};
declare class MqttClient extends SpaceBunny {
    protected mqttClient: MqttClient$1 | undefined;
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
    onMessage: (callback: IMqttCallback$1, opts?: IClientSubscribeOptions) => Promise<string | void>;
    /**
     * Publish a message on a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @param {Object/String} message - the message payload
     * @param {Object} opts - publication options
     * @return a promise containing the result of the operation
     */
    publish: (channel: string, message: Record<string, unknown>, opts?: IClientPublishOptions) => Promise<boolean>;
    /**
     * Destroy the connection between the mqtt client and broker
     *
     * @return a promise containing the result of the operation
     */
    disconnect(): Promise<boolean>;
    /**
     * Establish an mqtt connection with the broker.
     * If a connection already exists, returns the current connection
     *
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */
    connect: (opts?: IClientOptions) => Promise<MqttClient$1 | void>;
    isConnected: () => boolean;
    protected addMqttListener: (name: string, callback: IMqttCallback$1, topics?: string | string[]) => void;
    protected removeMqttListener: (name: string) => void;
    protected subscribe: (topics: string | string[], opts?: IClientSubscribeOptions) => Promise<void>;
    /**
     * Unsubscribe client from a list of topics
     *
     * @param {Object} topics - list of topics { topic: qos, ... }
     * e.g. { topic_1: 1, topic_2: 0 }
     * @return a promise containing the result of the operation
     */
    protected unsubscribe(topics?: string | string[]): Promise<void>;
    /**
     * Generate the topic for a specific channel
     *
     * @private
     * @param {String} deviceId - device id
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */
    private topicFor;
    private publishCachedMessages;
}

/**
 * A module that exports an MqttStreamClient client
 * which inherits from the Mqtt base client
 * @module MqttStreamClient
 */

type IMqttCallback = (topic?: string, message?: any) => Promise<void> | void;
interface IMqttLiveStreamHook extends ILiveStreamHook {
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

/**
 * A wrapper for the message object
 * @module Message
 */

declare class StompMessage {
    private message;
    private content;
    private headers;
    private senderId;
    private channelName;
    private receiverId;
    private discardMine;
    private discardFromApi;
    private static FROM_API_HEADER;
    /**
     * @constructor
     * @param {Object} opts - subscription options
     */
    constructor(opts: {
        message: IMessage | null;
        receiverId: string;
        subscriptionOpts: ISpaceBunnySubscribeOptions;
    });
    /**
     * Check if a message should be accepted of rejected
     *
     * @return Boolean - true if should be not considered, false otherwise
     */
    blackListed: () => boolean;
    /**
     * Check if a message comes from API
     * Check if it contains 'x-from-sb-api' header
     *
     * @return Boolean - true if it comes from API, false otherwise
     */
    private fromApi;
    ack: () => void;
    nack: () => void;
    getChannelName: () => string;
    getContent: <T = string | Record<string, unknown>>() => T;
}

/**
 * A module that exports an StompClient client
 * which inherits from the SpaceBunny base client
 * @module StompClient
 */

interface IStompPublishOptions {
    routingKey?: string;
    topic?: string;
}
interface IStompDestinationhOptions extends IStompPublishOptions {
    type?: string;
    channel?: string;
}
interface IStompConsumeOptions extends ISpaceBunnySubscribeOptions {
    ack?: 'client';
}
type IStompCallback$1 = (message: StompMessage) => Promise<void> | void;
type IStompListener = {
    callback: IStompCallback$1;
    topic: string;
    opts?: IStompConsumeOptions;
    subscription?: Stomp.StompSubscription;
};
declare class StompClient extends SpaceBunny {
    protected stompClient: Stomp.Client | undefined;
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
    onMessage: (callback: IStompCallback$1, opts?: IStompConsumeOptions) => Promise<void>;
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
    protected consumeCallback: (callback: IStompCallback$1, opts: IStompConsumeOptions | undefined, message: IMessage) => void;
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
    protected autoAck: (ack: string | undefined) => boolean;
    private publishCachedMessages;
}

/**
 * A module that exports an StompStreamClient client
 * which inherits from the Stomp base client
 * @module StompStreamClient
 */

type IStompCallback = (message: StompMessage) => Promise<void>;
interface IStompLiveStreamHook extends ILiveStreamHook {
    callback: IStompCallback;
    ack?: 'client';
}
interface IStompLiveStreamDestination extends ILiveStreamHook {
    type?: string;
}
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

export { AmqpClient, AmqpStreamClient, AmqpClient as Client, type ISpaceBunnyParams, MqttClient, MqttStreamClient, StompClient, StompStreamClient, AmqpStreamClient as StreamClient };
