'use strict';
var appRoot = require('app-root-path');
var AmqpClient = require(appRoot + '/index').AmqpClient;

var amqpClient = new AmqpClient({ apiKey: 'your-api-key' });
var channel = amqpClient.getChannels()[0];
amqpClient.publish(channel, { some: 'json' }).then(function(res) {
  process.exit(0);
}).catch(function(reason) {
  console.error(reason);
  process.exit(1);
})
