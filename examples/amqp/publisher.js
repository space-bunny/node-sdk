var appRoot = require('app-root-path');
var AmqpClient = require(appRoot + '/lib/index').AmqpClient;

var amqpClient = new AmqpClient({ apiKey: 'your-api-key' });
var channel = amqpClient.channels()[0];
amqpClient.publish(channel, { some: 'json' }).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
  process.exit(0);
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
  process.exit(1);
});
