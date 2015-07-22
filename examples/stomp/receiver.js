'use strict';
var appRoot = require('app-root-path');
var StompClient = require(appRoot + '/index').StompClient;

var messageCallback = function(message) {
  console.log(message.body);
};

var stompClient = new StompClient({ apiKey: 'your-api-ley' });
stompClient.onReceive(messageCallback).then(function(res) {
  console.log(res);
}).catch(function(reason) {
  console.error(reason);
});
