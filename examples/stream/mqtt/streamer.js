const MqttStreamClient = require('../../../lib/spacebunny').MqttStreamClient;

const args = require('minimist')(process.argv.slice(2));

// callback called when a message is received
const messageCallback = (topic, message) => {
  console.log(topic + ':' + message);  // eslint-disable-line no-console
};

// Auto Config
// You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io
const connectionParams = {
  client: args['client'] || 'your-client-id',
  secret: args['secret'] || 'your-secret',
};

// Auto Config with tls
// You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io
// const connectionParams = {
//   client: 'your-client-id',
//   secret: 'your-secret',
//   tls: true,
//   ca: '/path/to/ca_certificate.pem',
//   cert: '/path/to/client_certificate.pem',
//   key: '/path/to/client_key.pem'
// };

// Manual Config
// const connectionParams = {
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
// const streams = ['data', 'alarms'];
const stream = args['stream'] || '';
const streams = Array.isArray(stream) ? stream : [stream];
const streamHooks = [];
for (const streamName of streams) {
  streamHooks.push({ stream: streamName, callback: messageCallback });
}

const streamClient = new MqttStreamClient(connectionParams);
streamClient.streamFrom(streamHooks).then((res) => {
  console.log(res);  // eslint-disable-line no-console
}).catch((reason) => {
  console.error(reason);  // eslint-disable-line no-console
});
