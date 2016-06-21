var _ = require('underscore');
var MqttClient = require('spacebunny').MqttClient;

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
//   port: 1883, // default for MQTT
//   vhost: 'vhost',
//   channels: [ 'data', 'alarms' ]
// };

// If you want to connecto using a secure channel, you must enable tls
// and provide the client certificate paths [optional]
// var connectionParams = {
//   deviceKey: 'your-device-key',
//   tls: true,
//   ca: '/path/to/ca_certificate.pem',
//   cert: '/path/to/client_certificate.pem',
//   key: '/path/to/client_key.pem'
// };

var mqttClient = new MqttClient(connectionParams);

var disconnect = function() {
  mqttClient.disconnect().then(function(res) {
    console.log('Bye Bye.');
    process.exit(0);
  }).catch(function(reason) {
    console.error(reason);  // eslint-disable-line no-console
    process.exit(1);
  });
}

process.once('SIGINT', function() { disconnect(); });


_(60).times(function(n) {

  // 'publish' takes two mandatory arguments (channel's name and payload) and a variety of options: one of these options is
  // the retain flag, when is true means that messages are sent as retained messages
  // Take a look at SDK's documentation for further details.
  setTimeout(function(){
    // Publishing Options
    // retain: (default missing) if true means that messages are sent as retained messages
    var publishingOpts = { retain: true };
    var content = { some: 'json' };
    mqttClient.connect().then(function() {
      // Select a channel or you can use mqttClient.channels() to get the complete channels' list
      var channel = 'data';
      mqttClient.publish(channel, content, publishingOpts).then(function(res) {
        console.log('published message ' + (n+1));
        if (n == 59) { disconnect(); }
      }).catch(function(reason) {
        console.error(reason);  // eslint-disable-line no-console
        process.exit(1);
      });
    }).catch(function(reason) {
      console.error(reason);  // eslint-disable-line no-console
      process.exit(1);
    });
  }, n * 1000);

});
