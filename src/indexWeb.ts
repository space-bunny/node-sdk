// Device and Stream Clients
import StompClient from './protocols/stompClient';
import StompStreamClient from './protocols/stompStreamClient';

// Export clients in browser context
(window as any).StompClient = StompClient;
(window as any).StompStreamClient = StompStreamClient;

export {
  StompClient as Client,
  StompClient,
  StompStreamClient as StreamClient,
  StompStreamClient
};
