var appRoot = require('app-root-path');
var StompClient = require(appRoot + '/lib/index').StompClient;

var messageCallback = function(message) {
  console.log(message.body);  // eslint-disable-line no-console
};

// Manual Config
// var connectionParams = {
//   deviceId: 'device-id',
//   secret: 'device-secret',
//   host: 'hostname',
//   port: 61613, // default for STOMP
//   vhost: 'vhost',
//   channels: [ { name: 'data' }, { name: 'alarms' } ]
// };

// Auto Config
var connectionParams = { apiKey: 'your-api-key' };

var stompClient = new StompClient(connectionParams);
stompClient.onReceive(messageCallback).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
});
