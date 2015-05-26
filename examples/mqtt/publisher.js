'use strict';
var appRoot = require('app-root-path');
var MqttClient = require(appRoot + '/index').MqttClient;

var mqttClient = new MqttClient({ apiKey: 'my-api-key' });
var channel = mqttClient.getChannels()[0];
mqttClient.publish(channel, { some: 'json' }).then(function(res) {
  process.exit(0);
}).catch(function(reason) {
  console.error(reason);
  process.exit(1);
})
