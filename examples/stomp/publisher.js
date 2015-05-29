'use strict';
var appRoot = require('app-root-path');
var StompClient = require(appRoot + '/index').StompClient;

var messageCallback = function(message) {
  console.log(message.body);
};

// var stompClient = new StompClient({ apiKey: 'my-api-key' });
var stompClient = new StompClient({ apiKey: '75833f07-b8e0-4767-9f9a-6ffb976d12c0:DTGmcSpjS_rXerxvPPzYZQ' });
// var channel = stompClient.getChannels()[0];
var channel = 'messages';
stompClient.publish(channel, { some: 'json' }).then(function(res) {
  process.exit(0);
}).catch(function(reason) {
  console.error(reason);
  process.exit(1);
});
