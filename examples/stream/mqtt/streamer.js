'use strict';
var appRoot = require('app-root-path');
var MqttStreamClient = require(appRoot + '/lib/index').MqttStreamClient;

var messageCallback = function(topic, message) {
  console.log(topic + ':' + message);  // eslint-disable-line no-console
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

var streamClient = new MqttStreamClient(connectionParams);
streamClient.streamFrom(streamHooks).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
});
