'use strict';
var appRoot = require('app-root-path');
var AmqpClient = require(appRoot + '/lib/index').AmqpClient;

var messageCallback = function(message) {
  console.log(message.content);
};

var amqpClient = new AmqpClient({ apiKey: 'your-api-key' });
amqpClient.onReceive(messageCallback).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
});
