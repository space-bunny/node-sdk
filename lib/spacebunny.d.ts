/**
 * A module that exports the base SpaceBunny client
 * @module SpaceBunny
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
export interface ISpaceBunnyParams {
    endpoint?: any;
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
}
export interface IEndpointConfigs {
    connection?: ISpaceBunnyParams;
    liveStreams?: ILiveStream[];
    channels?: IChannel[];
}
export interface ITlsOptions {
    cert?: Buffer;
    key?: Buffer;
    passphrase?: string;
    ca?: Buffer[];
    rejectUnauthorized?: boolean;
    pfx?: Buffer;
}
export interface IProtocol {
    port?: number;
    tlsPort?: number;
}
export interface ILiveStream {
    name: string;
}
export interface IChannel {
    name: string;
}
export interface IEndpoint {
    protocol: string;
    secureProtocol: string;
    host: string;
    port: number;
    securePort: number;
    deviceConfigurationsPath: string;
    liveStreamKeyConfigurationsPath: string;
    url?: string;
}
export interface ILiveStreamHook {
    stream?: string;
    deviceId?: string;
    channel?: string;
    routingKey?: string;
    topic?: string;
    cache?: boolean;
}
export interface ISpaceBunnySubscribeOptions {
    discardMine?: boolean;
    discardFromApi?: boolean;
}
/**
 * @constructor
 * @param {Object} opts - constructor options may contain Device-Key or connection options
 */
declare class SpaceBunny extends EventEmitter {
    protected connectionParams: ISpaceBunnyParams;
    protected endpointConfigs: IEndpointConfigs;
    protected endpoint: IEndpoint;
    protected deviceKey: string;
    protected channels: IChannel[];
    protected deviceId: string;
    protected client: string;
    protected secret: string;
    protected host: string;
    protected port: number;
    protected vhost: string;
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
    protected static DEFAULT_CONNECTION_TIMEOUT: number;
    protected static DEFAULT_RECONNECT_TIMEOUT: number;
    protected static DEFAULT_HEARTBEAT: number;
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
    /**
     * @return all channels configured for the current device
     */
    getChannels: () => IChannel[];
    /**
     * @return the device ID for the current device
     */
    getDeviceId: () => string;
    /**
     * @return the client for the current stream
     */
    getClient: () => string;
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
}
export default SpaceBunny;
