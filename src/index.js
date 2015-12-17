// Device Clients
import Client from './protocols/amqp_client';
import AmqpClient from './protocols/amqp_client';
import MqttClient from './protocols/mqtt_client';
import StompClient from './protocols/stomp_client';
// Stream Clients
import StreamClient from './protocols/amqp_stream_client';
import AmqpStreamClient from './protocols/amqp_stream_client';
import MqttStreamClient from './protocols/mqtt_stream_client';
import StompStreamClient from './protocols/stomp_stream_client';

if (typeof window !== 'undefined') {
  window.StompClient = StompClient;
  window.StompStreamClient = StompStreamClient;
}
export { Client, AmqpClient, MqttClient, StompClient,
  StreamClient, AmqpStreamClient, MqttStreamClient, StompStreamClient };
