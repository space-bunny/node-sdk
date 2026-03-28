<p align="center">
  <img width="480" src="assets/logo.png"/>
</p>

[![NPM](https://img.shields.io/npm/v/spacebunny.svg?style=flat-square)](https://www.npmjs.com/package/spacebunny)
[![CI](https://github.com/space-bunny/node-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/space-bunny/node-sdk/actions/workflows/ci.yml)

[Space Bunny](http://spacebunny.io) is the IoT platform that makes it easy for you and your devices to send and exchange messages with a server or even with each other. You can store the data, receive timely event notifications, monitor live streams and remotely control your devices. Easy to use, and ready to scale at any time.

This is the source code repository for Node SDK.
Please feel free to contribute!

## Requirements

- Node.js >= 18.0.0

## Installation

```bash
npm install spacebunny --save
```

## Supported protocols

| Protocol | Device | Stream |
|----------|--------|--------|
| AMQP     | publish, receive | stream from live streams and channels |
| MQTT     | publish, receive | stream from live streams and channels |
| STOMP    | publish, receive (Node + Browser) | stream from live streams and channels |

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

## Usage within a web page (plain JS)

Space Bunny Node SDK is bundled to allow integration within a web page (STOMP protocol only)

### Device

#### STOMP receiver and publisher

In this example a device waits for incoming messages on its `inbox` channel and publishes a single message on the first configured channel

```html
<script src="https://github.com/space-bunny/node-sdk/blob/master/lib/spacebunny.var.js"></script>
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

For more advanced usage please refer to example files in `public` and `examples` folders

### Stream

A stream client can read from multiple live streams hooks

#### STOMP streamer

In this example the streamer receives all messages from stream `my-stream` and `my-stream-2`

```html
<script src="https://github.com/space-bunny/node-sdk/blob/master/lib/spacebunny.var.js"></script>
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

For more advanced usage please refer to example files in `public` and `examples` folders

## Run NODE examples

Examples cover device and stream scenarios:

### AMQP
```
npm run start:node-sample examples/device/amqp/receiver.js -- --deviceKey=my-device-key
npm run start:node-sample examples/device/amqp/publisher.js -- --deviceKey=my-device-key --channel=data
npm run start:node-sample examples/stream/amqp/streamer.js -- --client=client-id --secret=secret
 --stream=data --stream=alarms
```

### MQTT
```
npm run start:node-sample examples/device/mqtt/receiver.js -- --deviceKey=my-device-key
npm run start:node-sample examples/device/mqtt/publisher.js -- --deviceKey=my-device-key --channel=data
npm run start:node-sample examples/stream/mqtt/streamer.js -- --client=client-id --secret=secret
 --stream=data --stream=alarms
```

### STOMP
```
npm run start:node-sample examples/device/stomp/receiver.js -- --deviceKey=my-device-key
npm run start:node-sample examples/device/stomp/publisher.js -- --deviceKey=my-device-key --channel=data
npm run start:node-sample examples/stream/stomp/streamer.js -- --client=client-id --secret=secret
 --stream=data --stream=alarms
```

For more advanced usage please refer to example files in `public` and `examples` folders

## Run HTML examples

`npm run start:samples`

Examples will be available on port 8080

## Development

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build library with tsup |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:coverage` | Run tests with coverage |
| `npm run start:dev` | Start dev mode with watch |

### Tech stack

- **TypeScript** 5.7
- **Build**: tsup (esbuild)
- **Test**: Jest 29 + ts-jest
- **Lint**: ESLint 9 (flat config) + Prettier
- **CI/CD**: GitHub Actions (Node 18, 20, 22)
- **Git hooks**: Husky 9

### Runtime dependencies

Only 3 protocol-specific dependencies:

- `@stomp/stompjs` — STOMP protocol
- `amqplib` — AMQP protocol
- `mqtt` — MQTT protocol

No utility libraries (axios, lodash, etc.) — the SDK uses native Node.js APIs (`fetch`, `crypto`, `structuredClone`).

## License

The library is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
