import { IMessage } from '@stomp/stompjs';
import { ISpaceBunnySubscribeOptions } from '../spacebunny';
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
    getContent: () => object;
}
export default StompMessage;
