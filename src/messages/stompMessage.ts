/**
* A wrapper for the message object
* @module Message
*/
import { IMessage, StompHeaders } from '@stomp/stompjs';

import { ISpaceBunnySubscribeOptions } from '../spacebunny';
import { parseContent } from '../utils';

class StompMessage {
  private message: IMessage;

  private content: object;

  private headers: StompHeaders;

  private senderId: string;

  private channelName: string

  private receiverId: string;

  private discardMine: boolean;

  private discardFromApi: boolean;

  private static FROM_API_HEADER = 'x-from-sb-api';

  /**
  * @constructor
  * @param {Object} opts - subscription options
  */
  constructor(opts: { message: IMessage | null; receiverId: string;
    subscriptionOpts: ISpaceBunnySubscribeOptions; }) {
    const { message = undefined, receiverId = '', subscriptionOpts = {} } = opts;
    const { discardMine = false, discardFromApi = false } = subscriptionOpts;
    this.message = message;
    const body: string = message.body || '{}';
    this.content = parseContent(body);
    this.headers = message.headers || {};
    const destination = this.headers.destination.split('/');
    const [senderId, channelName] = destination[destination.length - 1].split('.');
    this.senderId = senderId;
    this.channelName = channelName;
    this.receiverId = receiverId;
    this.discardMine = discardMine;
    this.discardFromApi = discardFromApi;
  }

  /**
  * Check if a message should be accepted of rejected
  *
  * @return Boolean - true if should be not considered, false otherwise
  */
  public blackListed = () => {
    if (this.discardMine && this.receiverId === this.senderId && !this.fromApi()) return true;
    if (this.discardFromApi && this.fromApi()) return true;
    return false;
  }

  /**
  * Check if a message comes from API
  * Check if it contains 'x-from-sb-api' header
  *
  * @return Boolean - true if it comes from API, false otherwise
  */
  private fromApi = () => {
    return (this.headers && this.headers[StompMessage.FROM_API_HEADER]);
  }

  public ack = () => { this.message.ack(); }

  public nack = () => { this.message.nack(); }

  public getChannelName = (): string => { return this.channelName; }

  public getContent = (): object => { return this.content; }
}

export default StompMessage;
