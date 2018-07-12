# Change Log
All notable changes to this project will be documented in this file.
`Space Bunny Node SDK` adheres to [Semantic Versioning](http://semver.org/).

- `0.1.x` Releases - [0.1.0]
- `0.2.x` Releases - [0.2.0] [0.2.1]
- `0.3.x` Releases - [0.3.0]
- `0.4.x` Releases - [0.4.0] [0.4.1] [0.4.3] [0.4.4]
- `0.5.x` Releases - [0.5.0] [0.5.1] [0.5.2]
- `0.6.x` Releases - [0.6.0]

---

## [0.6.0](https://github.com/space-bunny/node-sdk/releases/tag/v0.5.2)

#### Changed

- Add custom binding keys for stream clients
- Add unsubscribe for AMQP stream client

## [0.5.2](https://github.com/space-bunny/node-sdk/releases/tag/v0.5.2)

#### Changed

- Fix STOMP unsubscribe

## [0.5.1](https://github.com/space-bunny/node-sdk/releases/tag/v0.5.1)

#### Changed

- Update dependencies
- Remove warnings
- Fix temp queue name

## [0.5.0](https://github.com/space-bunny/node-sdk/releases/tag/v0.5.0)

#### Changed

- Improve support for endpoint configs
- Emit events for connections (connect, disconnect, close, error)

## [0.4.4](https://github.com/space-bunny/node-sdk/releases/tag/v0.4.4)

#### Changed

- Fix source map paths

## [0.4.3](https://github.com/space-bunny/node-sdk/releases/tag/v0.4.3)

#### Changed

- Fix AmqpClient reconnection

## [0.4.1](https://github.com/space-bunny/node-sdk/releases/tag/v0.4.1)

#### Changed

- Improve content parsing
- Update examples

## [0.4.0](https://github.com/space-bunny/node-sdk/releases/tag/v0.4.0)

#### Changed

- Move from SSL to TLS
- Client Connect as public API

## [0.3.0](https://github.com/space-bunny/node-sdk/releases/tag/v0.3.0)

#### Changed

- Endpoint configurations

#### Improved

- Upgrade TLS version to 1.2

## [0.2.1](https://github.com/space-bunny/node-sdk/releases/tag/v0.2.1)

#### Fixed

- Content type for configurations API

## [0.2.0](https://github.com/space-bunny/node-sdk/releases/tag/v0.2.0)

#### Added  

- Ack / Nack handling for STOMP clients
- support for DiscardMine and DiscardFromApi options

## [0.1.0](https://github.com/space-bunny/node-sdk/releases/tag/v0.1.0)

#### Added  
- AMQP, STOMP, MQTT clients
- AMQP, STOMP, MQTT stream clients
