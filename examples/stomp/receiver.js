var appRoot = require('app-root-path');
var StompClient = require(appRoot + '/lib/index').StompClient;

var messageCallback = function(message) {
  console.log(message.body);  // eslint-disable-line no-console
};

var stompClient = new StompClient({ apiKey: 'your-api-key' });
stompClient.onReceive(messageCallback).then(function(res) {
  console.log(res);  // eslint-disable-line no-console
}).catch(function(reason) {
  console.error(reason);  // eslint-disable-line no-console
});
