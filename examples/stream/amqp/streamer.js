'use strict';
var AmqpStreamClient = require('spacebunny').AmqpStreamClient;

// callback called whan a message is received
var messageCallback = function(content, field, properties) {
  console.log(content);
};

// Auto Config
// You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io
var connectionParams = {
  client: 'your-client-id',
  secret: 'your-secret',
};

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

// Manual Config
// var connectionParams = {
//   client: 'your-client-id',
//   secret: 'your-secret',
//   host: 'host',
//   port: 61613, // default for MQTT
//   vhost: 'vhost'
// };

// Stream hooks contains the stream name from which you want to collect data
// and the callback which is invoked when receiving a message on that stream
// the boolean cache option can be passed to specify the stream connection mode.
//
// Options:
// stream: represents the stream name
// cache: (default true)
//    true (or missing) means that you want to read messages from the stream cache
//    false means that you want to read messages in a temporary queue that will be delete on disconnect
var streamHooks = [
  { stream: 'stream-name', callback: messageCallback },
  { stream: 'stream-name-2', callback: messageCallback }
];

var streamClient = new AmqpStreamClient(connectionParams);
streamClient.streamFrom(streamHooks).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
});
