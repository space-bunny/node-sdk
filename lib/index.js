'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StompStreamClient = exports.MqttStreamClient = exports.AmqpStreamClient = exports.StreamClient = exports.StompClient = exports.MqttClient = exports.AmqpClient = exports.Client = undefined;

var _amqpClient = require('./protocols/amqpClient');

var _amqpClient2 = _interopRequireDefault(_amqpClient);

var _mqttClient = require('./protocols/mqttClient');

var _mqttClient2 = _interopRequireDefault(_mqttClient);

var _stompClient = require('./protocols/stompClient');

var _stompClient2 = _interopRequireDefault(_stompClient);

var _amqpStreamClient = require('./protocols/amqpStreamClient');

var _amqpStreamClient2 = _interopRequireDefault(_amqpStreamClient);

var _mqttStreamClient = require('./protocols/mqttStreamClient');

var _mqttStreamClient2 = _interopRequireDefault(_mqttStreamClient);

var _stompStreamClient = require('./protocols/stompStreamClient');

var _stompStreamClient2 = _interopRequireDefault(_stompStreamClient);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Export clients in browser context

// Stream Clients
// Device Clients
if (typeof window !== 'undefined') {
  window.StompClient = _stompClient2.default;
  window.StompStreamClient = _stompStreamClient2.default;
}

// Export clients in NodeJS context
exports.Client = _amqpClient2.default;
exports.AmqpClient = _amqpClient2.default;
exports.MqttClient = _mqttClient2.default;
exports.StompClient = _stompClient2.default;
exports.StreamClient = _amqpStreamClient2.default;
exports.AmqpStreamClient = _amqpStreamClient2.default;
exports.MqttStreamClient = _mqttStreamClient2.default;
exports.StompStreamClient = _stompStreamClient2.default;
//# sourceMappingURL=index.js.map
