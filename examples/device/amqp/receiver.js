'use strict';
var AmqpClient = require('spacebunny').AmqpClient;

// callback called whan a message is received
var messageCallback = function(content, field, properties) {
  console.log(content);
};

// Prerequisites: you have created a device through the Space Bunny's web interface. You also have a 'data' channel (name
// is not mandatory, but we'll use this for our example). You have also enabled 'data' channel for the device. See our
// Getting Started [link] for a quick introduction to Space Bunny's base concepts.

// Once everything is set up get your Device-Key from Space Bunny's web application: on the web interface,
// go to devices section and create or pick an existing device. Click on the 'SHOW CONFIGURATION' link,
// copy the Device-Key and substitute it here:
var connectionParams = { deviceKey: 'your-device-key' };
// You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io

// You can also provide full manual configuration
// var connectionParams = {
//   deviceId: 'device-id',
//   secret: 'device-secret',
//   host: 'hostname',
//   port: 5672, // default for AMQP
//   vhost: 'vhost',
//   channels: [ 'data', 'alarms' ]
// };

// If you want to connecto using a secure channel, you must enable ssl
// and provide the client certificate path
// var connectionParams = {
//   deviceKey: 'your-device-key',
//   ssl: true,
//   ca: '/path/to/ca_certificate.pem',
//   cert: '/path/to/client_certificate.pem',
//   key: '/path/to/client_key.pem'
// };

// Let's instantiate a Space Bunny AMQP client, providing the Device-Key, that's the fastest and simplest method
// to create a new client.
var amqpClient = new AmqpClient(connectionParams);

// At this point the SDK is auto-configured and ready to use.
// Configurations are automatically lazy-fetched by the SDK itself and the connection
// will be opened calling the onReceive method
var disconnect = function() {
  amqpClient.disconnect().then(function(res) {
    console.log('Bye Bye.');
    process.exit(0);
  }).catch(function(reason) {
    console.error(reason);  // eslint-disable-line no-console
    process.exit(1);
  });
}

process.once('SIGINT', function() { disconnect(); });

// RECEIVING MESSAGES
// 'onReceive' options:

// noAck (default true) the broker won't expect an acknowledgement of messages delivered

// 'discardFromApi' (default false) causes the SDK to filter out messages published through APIs (or WEB UI) or
// generally sent directly through Space Bunny's platform.

// 'discardMine' (default false) causes the SDK to filter out auto-messages i.e. messages sent from this device
// and, for some reason, returned to the sender. This can happen in some particular situation such as when using m2m
// groups.

// 'allUpTo' (default true), all outstanding messages prior to and including the given message shall be considered acknowledged.
// If false, or omitted, only the message supplied is acknowledged.

// 'requeue' (default false) is truthy, the server will try to put the message or messages back on the queue or queues from which they came.
var subscriptionOpts = { noAck: false, allUpTo: false, requeue: false, discardMine: false, discardFromApi: false };

// When a message is sent on the inbox channel of the current device, the callback function will bel called
amqpClient.onReceive(messageCallback, subscriptionOpts).then(function(res) {
  console.log('Start receiving..');  // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
});
