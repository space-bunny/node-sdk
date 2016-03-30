var _ = require('underscore');
var StompClient = require('spacebunny').StompClient;

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

var disconnect = function() {
  stompClient.disconnect().then(function(res) {
    console.log('Bye Bye.');
    process.exit(0);
  }).catch(function(reason) {
    console.error(reason);  // eslint-disable-line no-console
    process.exit(1);
  });
}

process.once('SIGINT', function() { disconnect(); });

// At this point the SDK is auto-configured and ready to use.
// Configurations are automatically lazy-fetched by the SDK itself and the connection
// will be opened calling the publish method

 // PUBLISHING MESSAGES

// As said in the prerequisites, we'll assume that 'data' channel is enabled for your device.
// If you're in doubt, please check that this is true through Space Bunny's web interface, by clicking on the device
// 'edit' (pencil icon) and verifying that 'data' channel is present and enabled for this device. Take a look at Getting
// Started [link] for a quick introduction to Space Bunny's base concepts.

// Let's publish, for instance, some JSON. Payload can be everything you want, Space Bunny does not impose any constraint
// on format or content of payload.

// Publish one message every second for a minute.
_(60).times(function(n) {

    // 'publish' takes two mandatory arguments (channel's name and payload) and a variety of options: one of these options is
    // the 'withConfirm' flag: when set to true this requires Space Bunny's platform to confirm the receipt of the message.
    // This is useful when message delivery assurance is mandatory for your use case.
    // Take a look at SDK's documentation for further details.
    setTimeout(function(){
      var content = { some: 'json' };
      var publishOpts = { withConfirm: true };
      stompClient.publish('data', content, publishOpts).then(function(res) {
        console.log('published message ' + (n+1));
        if (n == 59) { disconnect(); }
      }).catch(function(reason) {
        console.error(reason);  // eslint-disable-line no-console
        process.exit(1);
      });

    }, n * 1000);

});

// Bonus points:
//
// Space Bunny AMQP SDK uses "amqplib" [http://www.squaremobius.net/amqp.node/channel_api.html#channel_publish] under the hoods so it supports all the features and attributes provided
// by the AMQP protocol. For instance, providing 'headers' or a 'timestamp' attribute is just a matter of adding it
// as options after the payload:

// 'timestamp' property and 'Timestamp' header can be used to provide a 'captured at' timestamp to data persisted
// by 'Persistence' plugin. Learn more [link].
