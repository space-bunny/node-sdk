// Device Clients
import Client from './protocols/amqpClient';
import AmqpClient from './protocols/amqpClient';
import MqttClient from './protocols/mqttClient';
import StompClient from './protocols/stompClient';
// Stream Clients
import StreamClient from './protocols/amqpStreamClient';
import AmqpStreamClient from './protocols/amqpStreamClient';
import MqttStreamClient from './protocols/mqttStreamClient';
import StompStreamClient from './protocols/stompStreamClient';

// Export clients in browser context
if (typeof window !== 'undefined') {
  window.StompClient = StompClient;
  window.StompStreamClient = StompStreamClient;
}

// Export clients in NodeJS context
export { Client, AmqpClient, MqttClient, StompClient,
  StreamClient, AmqpStreamClient, MqttStreamClient, StompStreamClient };
