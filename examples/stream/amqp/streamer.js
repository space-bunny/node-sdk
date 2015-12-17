'use strict';
var appRoot = require('app-root-path');
var AmqpStreamClient = require(appRoot + '/lib/index').AmqpStreamClient;

var messageCallback = function(message) {
  console.log(message.content);
};

// Manual Config
// var connectionParams = {
//   client: 'client',
//   secret: 'msecret',
//   host: 'host',
//   port: 1883, // default for MQTT
//   vhost: 'vhost'
// };


// Auto Config
var connectionParams = { client: 'client', secret: 'secret' };

// Auto Config with SSL
// var connectionParams = {
//   client: 'client',
//   secret: 'secret',
//   ssl: true,
//   ca: '/path/to/ca_certificate.pem',
//   cert: '/path/to/client_certificate.pem',
//   key: '/path/to/client_key.pem'
// };

var streamHooks = [
  { deviceId: 'device-id', channel: 'channel-1', callback: messageCallback },
  { deviceId: 'device-id', channel: 'channel-2', callback: messageCallback }
];

var streamClient = new AmqpStreamClient(connectionParams);
streamClient.streamFrom(streamHooks).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
});
