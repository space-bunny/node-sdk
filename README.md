<p align="center">
  <img width="480" src="assets/logo.png"/>
</p>

[Space Bunny](http://spacebunny.io) is the IoT platform that makes it easy for you and your devices to send and exchange messages with a server or even with each other. You can store the data, receive timely event notifications, monitor live streams and remotely control your devices. Easy to use, and ready to scale at any time.

This is the source code repository for Node SDK.
Please feel free to contribute!

## Installation

`npm install spacebunny --save`

## Basic usage

### Device

Devices can publish messages on configured channels and receive messages on their `inbox` channel

#### AMQP publisher

In this example a device publishes a single message on the first configured channel

```javascript
'use strict';
var AmqpClient = require('spacebunny').AmqpClient;
// Use your Api Key
var connectionParams = { apiKey: 'your-api-key' };
var amqpClient = new AmqpClient(connectionParams);
var content = { some: 'json' };
var channels = amqpClient.channels();
amqpClient.publish(channels[0], content).then(function(res) {
  console.log('Message published!');
  amqpClient.disconnect();
  process.exit(0);
}).catch(function(reason) {
  console.error(reason);
  process.exit(1);
});
```

#### AMQP receiver

In this example a device waits for incoming messages on its `inbox` channel

```javascript
'use strict';
var AmqpClient = require('spacebunny').AmqpClient;
// callback called whan a message is received
var messageCallback = function(content, field, properties) {
  console.log(content);
};
// Use your Api Key
var connectionParams = { apiKey: 'your-api-key' };
var amqpClient = new AmqpClient(connectionParams);
amqpClient.onReceive(messageCallback).then(function(res) {
  console.log('Start receiving..');
}).catch(function(reason) {
  console.error(reason);
});
```

For more advanced usage please refer to example files in `examples` folder

### Stream

A stream client can read from multiple live streams hooks

#### AMQP streamer

In this example the streamer receives all messages from stream `my-stream` and `my-stream-2`

```javascript
'use strict';
var AmqpStreamClient = require('spacebunny').AmqpStreamClient;
// callback called when a message is received
var messageCallback = function(content, field, properties) {
  console.log(content);
};
// Use your client ID and secret
var connectionParams = {
  client: 'your-client-id',
  secret: 'your-secret'
};
var streamClient = new AmqpStreamClient(connectionParams);
// Use your stream name
var streamHooks = [
  { stream: 'my-stream', callback: messageCallback },
  { stream: 'my-stream-2', callback: messageCallback }
];
streamClient.streamFrom(streamHooks).then(function(res) {
  console.log(res);
}).catch(function(reason) {
  console.error(reason);
});
```
For more advanced usage please refer to example files in `examples` folder

## Usage within a web page

Space Bunny Node SDK is bundled using Webpack to allow the integration of the library within a web page

### Device

#### STOMP receiver and publisher

In this example a device waits for incoming messages on its `inbox` channel and publishes a single message on the first configured channel

```html
<script src="https://raw.githubusercontent.com/space-bunny/node-sdk/master/dist/spacebunny.js"></script>
<script>
  [...]
  // Use your Api Key
  var connectionParams = { apiKey: 'your-api-key' };
  var webStompClient = new StompClient(connectionParams);
  webStompClient.onReceive(messageCallback).then(function(res) {
    console.log('Successfully connected!');
  }).catch(function(reason) {
    console.error(reason);
  });
  var content = { some: 'json' };
  var channels = webStompClient.channels();
  webStompClient.publish(channels[0], content).then(function(res) {
    console.log('Message published!');
  }).catch(function(reason) {
    console.error(reason);
  });
  [...]
</script>
```

For more advanced usage please refer to example files in `dist` folder

### Stream

A stream client can read from multiple live streams hooks

#### STOMP streamer

In this example the streamer receives all messages from stream `my-stream` and `my-stream-2`

```html
<script src="https://raw.githubusercontent.com/space-bunny/node-sdk/master/dist/spacebunny.js"></script>
<script>
  [...]
  var connectionParams = {
    client: 'your-client-id',
    secret: 'your-secret'
  };
  var streamClient = new StompStreamClient(connectionParams);
  // Use your stream name
  var streamHooks = [
    { stream: 'my-stream', callback: messageCallback },
    { stream: 'my-stream-2', callback: messageCallback }
  ];
  streamClient.streamFrom(streamHooks).then(function(res) {
    console.log(res);
  }).catch(function(reason) {
    console.error(reason);
  });
  [...]
</script>
```

For more advanced usage please refer to example files in `dist` folder

## Watch changes to src files (with automatic transpilation on save)

`gulp watch`

## Build dist version

`gulp build`

## Generate documentation

`gulp docs`

## License

The gem is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
