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
// endpointUrl is not required,
// use it only if you need to specify a different endpoint from demo.spacebunny.io
// var connectionParams = {
//   endpointUrl: 'http://my-endpoint-url',
//   client: 'client',
//   secret: 'secret'
// };

// Auto Config with SSL
// endpointUrl is not required,
// use it only if you need to specify a different endpoint from demo.spacebunny.io
// var connectionParams = {
//   endpointUrl: 'http://my-endpoint-url',
//   client: 'client',
//   secret: 'secret',
//   ssl: true,
//   ca: '/path/to/ca_certificate.pem',
//   cert: '/path/to/client_certificate.pem',
//   key: '/path/to/client_key.pem'
// };

// var streamHooks = [
//   { stream: 'stream-id', callback: messageCallback },
//   { stream: 'stream-id', callback: messageCallback }
// ];

var streamClient = new MqttStreamClient(connectionParams);
streamClient.streamFrom(streamHooks).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
});
