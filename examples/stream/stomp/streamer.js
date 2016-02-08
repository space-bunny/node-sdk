'use strict';
var appRoot = require('app-root-path');
var StompStreamClient = require(appRoot + '/lib/index').StompStreamClient;

var messageCallback = function(message) {
  console.log(message.body);
};

// Manual Config
// var connectionParams = {
//   client: 'your-client-id',
//   secret: 'your-secret',
//   host: 'host',
//   port: 61613, // default for MQTT
//   vhost: 'vhost'
// };

// Auto Config
// You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io
// var connectionParams = {
//   client: 'your-client-id',
//   secret: 'your-secret',
// };

// Auto Config with SSL
// You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io
// var connectionParams = {
//   client: 'your-client-id',
//   secret: 'your-secret',
//   ssl: true,
//   ca: '/path/to/ca_certificate.pem',
//   cert: '/path/to/client_certificate.pem',
//   key: '/path/to/client_key.pem'
// };

// var streamHooks = [
//   { stream: 'stream-name', callback: messageCallback },
//   { stream: 'stream-name', callback: messageCallback }
// ];

var streamClient = new StompStreamClient(connectionParams);
streamClient.streamFrom(streamHooks).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
});
