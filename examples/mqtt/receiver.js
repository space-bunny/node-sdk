'use strict';
var appRoot = require('app-root-path');
var MqttClient = require(appRoot + '/index').MqttClient;

var messageCallback = function(topic, message) {
  console.log(topic + ': ' + message);
};

var mqttClient = new MqttClient({ apiKey: 'my-api-key' });
mqttClient.onReceive(messageCallback).then(function(res) {
  console.log(res);
}).catch(function(reason) {
  console.error(reason);
})
