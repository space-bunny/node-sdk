const StompClient = require('../../../lib/spacebunny').StompClient;
const args = require('minimist')(process.argv.slice(2));

const messageCallback = (content) => {
  console.log(content.body);  // eslint-disable-line no-console
};

// Prerequisites: you have created a device through the Space Bunny's web interface. You also have a 'data' channel (name
// is not mandatory, but we'll use this for our example). You have also enabled 'data' channel for the device. See our
// Getting Started [link] for a quick introduction to Space Bunny's base concepts.

// Once everything is set up get your Device-Key key from Space Bunny's web application: on the web interface,
// go to devices section and create or pick an existing device. Click on the 'SHOW CONFIGURATION' link,
// copy the Device-Key and substitute it here:
const deviceKey = args['deviceKey'] || args['device-key'] || args['device_key'] || 'my-device-key';
const tls = (args['tls'] !== false);
const connectionParams = { deviceKey, tls };

// You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io

// Manual Config
// const connectionParams = {
//   deviceId: 'device-id',
//   secret: 'device-secret',
//   host: 'hostname',
//   port: 61613, // default for STOMP
//   vhost: 'vhost',
//   channels: [ 'data', 'alarms' ]
// };

// If you want to connecto using a secure channel, you must enable tls
// and provide the client certificate paths [optional]
// const connectionParams = {
//   deviceKey: 'your-device-key',
//   tls: true,
//   ca: '/path/to/ca_certificate.pem',
//   cert: '/path/to/client_certificate.pem',
//   key: '/path/to/client_key.pem'
// };

// Let's instantiate a Space Bunny STOMP client, providing the device's API key, that's the fastest and simplest method
// to create a new client.
const stompClient = new StompClient(connectionParams);

// At this point the SDK is auto-configured and ready to use.
// Configurations are automatically lazy-fetched by the SDK itself and the connection
// will be opened calling the onReceive method
const disconnect = () => {
  stompClient.disconnect().then(() => {
    console.log('Bye Bye.'); // eslint-disable-line no-console
    process.exit(0);
  }).catch((reason) => {
    console.error(reason);  // eslint-disable-line no-console
    process.exit(1);
  });
};

process.once('SIGINT', () => { disconnect(); });

// RECEIVING MESSAGES
// 'onReceive' options:

// 'discardFromApi' (default false) causes the SDK to filter out messages published through APIs (or WEB UI) or
// generally sent directly through Space Bunny's platform.

// 'discardMine' (default false) causes the SDK to filter out auto-messages i.e. messages sent from this device
// and, for some reason, returned to the sender. This can happen in some particular situation such as when using m2m
// groups.

// 'ack' (default undefined) if ack option has value 'client' means that STOMP messages
// must be explicitly acked/nacked by client. Otherwise messages are automatically acked/nacked
const subscriptionOpts = { discardMine: false, discardFromApi: false };

// When a message is sent on the inbox channel of the current device, the callback function will bel called
stompClient.connect().then(() => {
  stompClient.onReceive(messageCallback, subscriptionOpts).then(() => {
    console.log('Start receiving..');  // eslint-disable-line no-console
  }).catch((reason) => {
    console.error(reason);  // eslint-disable-line no-console
  });
}).catch((reason) => {
  console.error(reason);  // eslint-disable-line no-console
});
