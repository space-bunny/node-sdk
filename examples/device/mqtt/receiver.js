var MqttClient = require('spacebunny').MqttClient;

var messageCallback = function(topic, message) {
  console.log(topic + ':' + message);  // eslint-disable-line no-console
};

// Manual Config
// var connectionParams = {
//   deviceId: 'device-id',
//   secret: 'device-secret',
//   host: 'hostname',
//   port: 1883, // default for MQTT
//   vhost: 'vhost',
//   channels: [ { name: 'data' }, { name: 'alarms' } ]
// };

// Auto Config
var connectionParams = { apiKey: 'your-api-key' };

// Auto Config with SSL
// var connectionParams = {
//   apiKey: 'your-api-key',
//   ssl: true,
//   ca: '/path/to/ca_certificate.pem',
//   cert: '/path/to/client_certificate.pem',
//   key: '/path/to/client_key.pem'
// };

var mqttClient = new MqttClient(connectionParams);

mqttClient.onReceive(messageCallback).then(function(res) {
  console.log(res); // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason.stack);  // eslint-disable-line no-console
});
