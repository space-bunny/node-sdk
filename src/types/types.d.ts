import StompClient from 'src/protocols/stompClient';
import StompStreamClient from 'src/protocols/stompStreamClient';

// declare module 'uuid-v4';
declare global {
  interface Window {
    StompClient: StompClient;
    StompStreamClient: StompStreamClient;
  }
}
