import * as amqp from 'amqplib';
import { ISpaceBunnySubscribeOptions } from '../spacebunny';
declare class AmqpMessage {
    private message;
    private content;
    private channel;
    private senderId;
    private channelName;
    private receiverId;
    private discardMine;
    private discardFromApi;
    private static FROM_API_HEADER;
    /**
     * @constructor
     * @param {Object} message - the message received from the channel
     * @param {String} receiverId - the receiver id
     * @param {Object} opts - subscription options
     */
    constructor(opts: {
        message: amqp.ConsumeMessage | null;
        receiverId: string;
        channel: amqp.Channel | amqp.ConfirmChannel;
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
    fromApi: () => any;
    ack: (opts?: any) => void;
    nack: (opts?: any) => void;
    getContent: () => object;
    getProperties: () => object;
    getFields: () => object;
    getChannelName: () => string;
}
export default AmqpMessage;
