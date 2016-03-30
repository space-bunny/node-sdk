var MqttClient = require('spacebunny').MqttClient;

// Prerequisites: you have created a device through the Space Bunny's web interface. You also have a 'data' channel (name
// is not mandatory, but we'll use this for our example). You have also enabled 'data' channel for the device. See our
// Getting Started [link] for a quick introduction to Space Bunny's base concepts.

// If for some reason or use case it's not possible or desirable to use auto-configuration, Space Bunny's Ruby SDK
// permits to manually configure the connection with various methods.

// First of all go to Space Bunny's web interface, go to the devices section and create or pick an existing device.
// Click on the 'SHOW CONFIGURATION' link and, from the 'Full configuration' section, copy the required params

// Manual Config
// var connectionParams = {
//   deviceId: 'device-id',
//   secret: 'device-secret',
//   host: 'hostname',
//   port: 1883, // default for MQTT
//   vhost: 'vhost-id',
//   channels: [ 'data', 'alarms' ]
// };

// You can simply use device's api key to connect with default configurations
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

// Get the first channel configured for the target device
var channel = mqttClient.channels()[0];
mqttClient.publish(channel, { some: 'json' }, { retain: true }).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
  mqttClient.disconnect();
  process.exit(0);
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
  process.exit(1);
});
