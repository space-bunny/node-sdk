const MqttClient = require('../../../lib/spacebunny').MqttClient;
const args = require('minimist')(process.argv.slice(2));

// Prerequisites: you have created a device through the Space Bunny's web interface. You also have a 'data' channel (name
// is not mandatory, but we'll use this for our example). You have also enabled 'data' channel for the device. See our
// Getting Started [link] for a quick introduction to Space Bunny's base concepts.

// Once everything is set up get your Device-Key from Space Bunny's web application: on the web interface,
// go to devices section and create or pick an existing device. Click on the 'SHOW CONFIGURATION' link,
// copy the Device-Key and substitute it here:
const deviceKey = args['deviceKey'] || args['device-key'] || args['device_key'] || 'my-device-key';
const tls = (args['tls'] !== false);
const connectionParams = { deviceKey, tls };

// You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io

// You can also provide full manual configuration
// const connectionParams = {
//   deviceId: 'device-id',
//   secret: 'device-secret',
//   host: 'hostname',
//   port: 1883, // default for MQTT
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

const mqttClient = new MqttClient(connectionParams);

const disconnect = () => {
  mqttClient.disconnect().then(() => {
    console.log('Bye Bye.');  // eslint-disable-line no-console
    process.exit(0);
  }).catch(function(reason) {
    console.error(reason);  // eslint-disable-line no-console
    process.exit(1);
  });
};

process.once('SIGINT', () => { disconnect(); });


for (let n = 0; n < 60; n++) {

  // 'publish' takes two mandatory arguments (channel's name and payload) and a variety of options: one of these options is
  // the retain flag, when is true means that messages are sent as retained messages
  // Take a look at SDK's documentation for further details.
  setTimeout(() => {
    // Publishing Options
    // retain: (default missing) if true means that messages are sent as retained messages
    const publishingOpts = { retain: true };
    const content = { some: 'json' };
    mqttClient.connect().then(() => {
      // Select a channel or you can use mqttClient.channels() to get the complete channels' list
      const channel = args['channel'] || 'data';
      mqttClient.publish(channel, content, publishingOpts).then(() => {
        console.log('published message ' + (n+1));   // eslint-disable-line no-console
        if (n == 59) { disconnect(); }
      }).catch((reason) => {
        console.error(reason);  // eslint-disable-line no-console
        process.exit(1);
      });
    }).catch((reason) => {
      console.error(reason);  // eslint-disable-line no-console
      process.exit(1);
    });
  }, n * 1000);

}
