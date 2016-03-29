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

// Stream hooks contains the stream name from which you want to collect data
// and the callback which is invoked when receiving a message on that stream
// the boolean cache option can be passed to specify the stream connection mode.
// cache true (or missing) means that you want to read messages from the stream cache
// cache false means that you want to read messages in a temporary queue that will be delete on disconnect
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
