import { MqttStreamClient } from '../../../lib/spacebunny';

// callback called whan a message is received
const messageCallback = (topic, message) => {
  console.log(topic + ':' + message);  // eslint-disable-line no-console
};

// Auto Config
// You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io
const connectionParams = {
  client: 'your-client-id',
  secret: 'your-secret',
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
const streamHooks = [
  { stream: 'stream-name', callback: messageCallback },
  { stream: 'stream-name-2', callback: messageCallback }
];

const streamClient = new MqttStreamClient(connectionParams);
streamClient.streamFrom(streamHooks).then((res) => {
  console.log(res);  // eslint-disable-line no-console
}).catch((reason) => {
  console.error(reason);  // eslint-disable-line no-console
});
