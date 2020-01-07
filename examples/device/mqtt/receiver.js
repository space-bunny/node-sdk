const MqttClient = require('../../../lib/spacebunny').MqttClient;
const args = require('minimist')(process.argv.slice(2));

const  messageCallback = (topic, message) => {
  console.log(topic + ':' + message);  // eslint-disable-line no-console
};

// Prerequisites: you have created a device through the Space Bunny's web interface. You also have a 'data' channel (name
// is not mandatory, but we'll use this for our example). You have also enabled 'data' channel for the device. See our
// Getting Started [link] for a quick introduction to Space Bunny's base concepts.

// Once everything is set up get your Device-Key from Space Bunny's web application: on the web interface,
// go to devices section and create or pick an existing device. Click on the 'SHOW CONFIGURATION' link,
// copy the Device-Key and substitute it here:
const deviceKey = args['deviceKey'] || args['device-key'] || args['device_key'] || 'my-device-key';
const tls = (args['tls'] !== false);
const connectionParams = { deviceKey, tls };

// You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io

// You can also provide full manual configuration
// const  connectionParams = {
//   deviceId: 'device-id',
//   secret: 'device-secret',
//   host: 'hostname',
//   port: 1883, // default for MQTT
//   vhost: 'vhost',
//   channels: [ 'data', 'alarms' ]
// };

// If you want to connecto using a secure channel, you must enable tls
// and provide the client certificate paths [optional]
// const  connectionParams = {
//   deviceKey: 'your-device-key',
//   tls: true,
//   ca: '/path/to/ca_certificate.pem',
//   cert: '/path/to/client_certificate.pem',
//   key: '/path/to/client_key.pem'
// };

const  mqttClient = new MqttClient(connectionParams);

mqttClient.connect().then(() => {
  mqttClient.onReceive(messageCallback).then(() => {
    console.log('Start receiving..');  // eslint-disable-line no-console
  }).catch((reason) => {
    console.error(reason);  // eslint-disable-line no-console
  });
}).catch((reason) => {
  console.error(reason);  // eslint-disable-line no-console
});
