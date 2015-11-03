var appRoot = require('app-root-path');
var MqttClient = require(appRoot + '/lib/index').MqttClient;

var messageCallback = function(topic, message) {
  console.log(topic + ':' + message);  // eslint-disable-line no-console
};

var mqttClient = new MqttClient({ apiKey: 'your-api-key' });
mqttClient.onReceive(messageCallback).then(function(res) {
  console.log(res); // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason.stack);  // eslint-disable-line no-console
});
