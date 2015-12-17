var appRoot = require('app-root-path');
var StompClient = require(appRoot + '/lib/index').StompClient;

// Manual Config
// var connectionParams = {
//   deviceId: 'device-id',
//   secret: 'device-secret',
//   host: 'hostname',
//   port: 61613, // default for STOMP
//   vhost: 'vhost',
//   channels: [ { name: 'data' }, { name: 'alarms' } ]
// };

// Auto Config
var connectionParams = { apiKey: 'your-api-key' };

// Auto Config with SSL
// var connectionParams = {
//   apiKey: 'your-api-key',
//   ssl: true,
//   ca: '/path/to/ca_certificate.pem',
//   cert: '/path/to/client_certificate.pem',
//   key: '/path/to/client_key.pem'
// };

var stompClient = new StompClient(connectionParams);
var channel = stompClient.channels()[0];
stompClient.publish(channel, { some: 'json' }).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
  stompClient.disconnect();
  process.exit(0);
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
  process.exit(1);
});
