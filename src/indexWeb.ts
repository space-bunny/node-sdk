// Device and Stream Clients
import StompClient from './protocols/stompClient';
import StompStreamClient from './protocols/stompStreamClient';
import { ISpaceBunnyParams } from './spacebunny';

// Export clients in browser context
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
(window as any).StompClient = StompClient;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
(window as any).StompStreamClient = StompStreamClient;

export {
  StompClient as Client,
  StompClient,
  StompStreamClient as StreamClient,
  StompStreamClient,
  ISpaceBunnyParams
};
