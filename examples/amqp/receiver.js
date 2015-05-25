'use strict';
var appRoot = require('app-root-path');
console.log(appRoot + '/index');
var AmqpClient = require(appRoot + '/index').AmqpClient;

var messageCallback = function(message) {
  console.log(JSON.parse(message.content));
};

var amqpClient = new AmqpClient({ apiKey: 'your-api-key' });
amqpClient.onReceive(messageCallback).then(function(res) {
  console.log(res);
}).catch(function(reason) {
  console.error(reason);
})
