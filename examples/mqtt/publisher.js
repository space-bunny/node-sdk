var appRoot = require('app-root-path');
var MqttClient = require(appRoot + '/lib/index').MqttClient;

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

var mqttClient = new MqttClient(connectionParams);
var channel = mqttClient.channels()[0];
mqttClient.publish(channel, { some: 'json' }).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
  process.exit(0);
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
  process.exit(1);
});
