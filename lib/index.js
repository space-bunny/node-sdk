'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StompStreamClient = exports.MqttStreamClient = exports.AmqpStreamClient = exports.StreamClient = exports.StompClient = exports.MqttClient = exports.AmqpClient = exports.Client = undefined;

var _amqp_client = require('./protocols/amqp_client');

var _amqp_client2 = _interopRequireDefault(_amqp_client);

var _mqtt_client = require('./protocols/mqtt_client');

var _mqtt_client2 = _interopRequireDefault(_mqtt_client);

var _stomp_client = require('./protocols/stomp_client');

var _stomp_client2 = _interopRequireDefault(_stomp_client);

var _amqp_stream_client = require('./protocols/amqp_stream_client');

var _amqp_stream_client2 = _interopRequireDefault(_amqp_stream_client);

var _mqtt_stream_client = require('./protocols/mqtt_stream_client');

var _mqtt_stream_client2 = _interopRequireDefault(_mqtt_stream_client);

var _stomp_stream_client = require('./protocols/stomp_stream_client');

var _stomp_stream_client2 = _interopRequireDefault(_stomp_stream_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Export clients in browser context

// Stream Clients
// Device Clients
if (typeof window !== 'undefined') {
  window.StompClient = _stomp_client2.default;
  window.StompStreamClient = _stomp_stream_client2.default;
}

// Export clients in NodeJS context
exports.Client = _amqp_client2.default;
exports.AmqpClient = _amqp_client2.default;
exports.MqttClient = _mqtt_client2.default;
exports.StompClient = _stomp_client2.default;
exports.StreamClient = _amqp_stream_client2.default;
exports.AmqpStreamClient = _amqp_stream_client2.default;
exports.MqttStreamClient = _mqtt_stream_client2.default;
exports.StompStreamClient = _stomp_stream_client2.default;
//# sourceMappingURL=index.js.map
