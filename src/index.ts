// Device and Stream Clients
import AmqpClient from './protocols/amqpClient';
import AmqpStreamClient from './protocols/amqpStreamClient';
import MqttClient from './protocols/mqttClient';
import MqttStreamClient from './protocols/mqttStreamClient';
import StompClient from './protocols/stompClient';
import StompStreamClient from './protocols/stompStreamClient';
import { ISpaceBunnyParams } from './spacebunny';

export {
  AmqpClient as Client,
  AmqpClient,
  MqttClient,
  StompClient,
  AmqpStreamClient,
  AmqpStreamClient as StreamClient,
  MqttStreamClient,
  StompStreamClient,
  ISpaceBunnyParams
};
