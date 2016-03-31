var MqttClient = require('spacebunny').MqttClient;

var messageCallback = function(topic, message) {
  console.log(topic + ':' + message);  // eslint-disable-line no-console
};

// Prerequisites: you have created a device through the Space Bunny's web interface. You also have a 'data' channel (name
// is not mandatory, but we'll use this for our example). You have also enabled 'data' channel for the device. See our
// Getting Started [link] for a quick introduction to Space Bunny's base concepts.

// Once everything is set up get your device's API key from Space Bunny's web application: on the web interface,
// go to devices section and create or pick an existing device. Click on the 'SHOW CONFIGURATION' link, copy the API key
// and substitute it here:
// You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io
var connectionParams = { apiKey: 'your-api-key' };

// You can also provide full manual configuration
// var connectionParams = {
//   deviceId: 'device-id',
//   secret: 'device-secret',
//   host: 'hostname',
//   port: 5672, // default for AMQP
//   vhost: 'vhost',
//   channels: [ 'data', 'alarms' ]
// };

// If you want to connecto using a secure channel, you must enable ssl
// and provide the client certificate path
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
