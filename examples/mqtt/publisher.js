var appRoot = require('app-root-path');
var MqttClient = require(appRoot + '/lib/index').MqttClient;

var mqttClient = new MqttClient({ apiKey: 'your-api-key' });
var channel = mqttClient.channels()[0];
mqttClient.publish(channel, { some: 'json' }).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
  process.exit(0);
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
  process.exit(1);
});
