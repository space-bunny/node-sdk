// Device and Stream Clients
import Client from './protocols/amqpClient';
import StreamClient from './protocols/amqpStreamClient';
import MqttClient from './protocols/mqttClient';
import MqttStreamClient from './protocols/mqttStreamClient';
import StompClient from './protocols/stompClient';
import StompStreamClient from './protocols/stompStreamClient';

// Export clients in browser context
if (typeof window !== 'undefined') {
  window.StompClient = StompClient;
  window.StompStreamClient = StompStreamClient;
}

export {
  Client,
  Client as AmqpClient,
  MqttClient,
  StompClient,
  StreamClient,
  StreamClient as AmqpStreamClient,
  MqttStreamClient,
  StompStreamClient
};
