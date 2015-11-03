var appRoot = require('app-root-path');
var StompClient = require(appRoot + '/lib/index').StompClient;

var stompClient = new StompClient({ apiKey: 'your-api-key' });
var channel = stompClient.channels()[0];
stompClient.publish(channel, { some: 'json' }).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
  process.exit(0);
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
  process.exit(1);
});
