var appRoot = require('app-root-path');
var StompClient = require(appRoot + '/lib/index').StompClient;

var messageCallback = function(message) {
  console.log(message.body);  // eslint-disable-line no-console
};

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
var connectionParams = {
  endpointUrl: 'localhost:3000',
  apiKey: 'e05bfd1f-305d-4590-b096-e751ba8dcd71:7G2DoVe2hWHNBka-mLrujA'
};

// Auto Config with SSL
// var connectionParams = {
//   apiKey: 'your-api-key',
//   ssl: true,
//   ca: '/path/to/ca_certificate.pem',
//   cert: '/path/to/client_certificate.pem',
//   key: '/path/to/client_key.pem'
// };

var stompClient = new StompClient(connectionParams);
stompClient.onReceive(messageCallback).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
});
