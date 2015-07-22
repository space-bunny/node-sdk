'use strict';
var appRoot = require('app-root-path');
var StompClient = require(appRoot + '/index').StompClient;

var messageCallback = function(message) {
  console.log(message.body);
};

var stompClient = new StompClient({ apiKey: 'your-api-key' });
var channel = stompClient.channels()[0];
stompClient.publish(channel, { some: 'json' }).then(function(res) {
  console.log(res);
  process.exit(0);
}).catch(function(reason) {
  console.error(reason);
  process.exit(1);
});
