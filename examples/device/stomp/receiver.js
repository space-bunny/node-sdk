var StompClient = require('spacebunny').StompClient;

var messageCallback = function(content, headers) {
  console.log(content);  // eslint-disable-line no-console
};

// Prerequisites: you have created a device through the Space Bunny's web interface. You also have a 'data' channel (name
// is not mandatory, but we'll use this for our example). You have also enabled 'data' channel for the device. See our
// Getting Started [link] for a quick introduction to Space Bunny's base concepts.

// Once everything is set up get your device's API key from Space Bunny's web application: on the web interface,
// go to devices section and create or pick an existing device. Click on the 'SHOW CONFIGURATION' link, copy the API key
// and substitute it here:
// You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io
var connectionParams = { apiKey: 'your-api-key' };

// Manual Config
// var connectionParams = {
//   deviceId: 'device-id',
//   secret: 'device-secret',
//   host: 'hostname',
//   port: 61613, // default for STOMP
//   vhost: 'vhost',
//   channels: [ { name: 'data' }, { name: 'alarms' } ]
// };

// If you want to connecto using a secure channel, you must enable ssl
// and provide the client certificate path
// var connectionParams = {
//   apiKey: 'your-api-key',
//   ssl: true,
//   ca: '/path/to/ca_certificate.pem',
//   cert: '/path/to/client_certificate.pem',
//   key: '/path/to/client_key.pem'
// };

// Let's instantiate a Space Bunny STOMP client, providing the device's API key, that's the fastest and simplest method
// to create a new client.
var stompClient = new StompClient(connectionParams);

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

// 'discardFromApi' (default false) causes the SDK to filter out messages published through APIs (or WEB UI) or
// generally sent directly through Space Bunny's platform.

// 'discardMine' (default false) causes the SDK to filter out auto-messages i.e. messages sent from this device
// and, for some reason, returned to the sender. This can happen in some particular situation such as when using m2m
// groups.

// 'ack' (default undefined) if ack option has value 'client' means that STOMP messages
// must be explicitly acked/nacked by client. Otherwise messages are automatically acked/nacked
var subscriptionOpts = { discardMine: false, discardFromApi: false };

// When a message is sent on the inbox channel of the current device, the callback function will bel called
stompClient.onReceive(messageCallback, subscriptionOpts).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
});
