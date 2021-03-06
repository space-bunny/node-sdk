# Change Log
All notable changes to this project will be documented in this file.
`Space Bunny Node SDK` adheres to [Semantic Versioning](http://semver.org/).

- `0.1.x` Releases - [0.1.0]
- `0.2.x` Releases - [0.2.0] [0.2.1]
- `0.3.x` Releases - [0.3.0]
- `0.4.x` Releases - [0.4.0] [0.4.1] [0.4.3] [0.4.4]
- `0.5.x` Releases - [0.5.0] [0.5.1] [0.5.2]
- `0.6.x` Releases - [0.6.0] [0.6.1]
- `0.6.x` Releases - [0.6.0] [0.6.1]
- `0.7.x` Releases - [0.7.0] [0.7.1] [0.7.2] [0.7.3] [0.7.4] [0.7.5] [0.7.6] [0.7.7] [0.7.8] [0.7.9] [0.7.11] [0.7.12] [0.7.13] [0.7.14] [0.7.15]
- `1.0.x` Releases - [1.0.0] [1.0.1]

---

## [1.0.1](https://github.com/space-bunny/node-sdk/releases/tag/v1.0.1)

#### Changed

- Update axios dependency

---

## [1.0.0](https://github.com/space-bunny/node-sdk/releases/tag/v1.0.0)

#### Changed

- Rewrite the library in TS

---

## [0.7.15](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.15)

#### Changed

- Add heartbeat to AMQP Connection

---

## [0.7.14](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.14)

#### Changed

- Fix connection error handling

---

## [0.7.13](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.13)

#### Changed

- Fix webpack externals

---

## [0.7.12](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.12)

#### Changed

- Updated some dependencies

---

## [0.7.11](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.11)

#### Changed

- Updated some dependencies

## [0.7.10](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.10)

#### Changed

- Updated some dependencies

## [0.7.9](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.9)

#### Changed

- Wait for channel open in AmqpClient publish

## [0.7.8](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.8)

#### Changed

- Add random seed to temp queue

## [0.7.7](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.7)

#### Changed

- Empty channel on error

## [0.7.6](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.6)

#### Changed

- Clone options

## [0.7.5](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.5)

#### Changed

- Fix opts merge in publish
- Fix default routing key for AMPQ stream client

## [0.7.4](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.4)

#### Changed

- Fix opts merge in publish

## [0.7.3](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.3)

#### Changed

- Remove when library (use Promise.all instead)

## [0.7.2](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.2)

#### Changed

- Connect to stream by its name

## [0.7.1](https://github.com/space-bunny/node-sdk/releases/tag/v0.7.1)

#### Changed

- Fix URL generation

#### Changed

- Add support for publishing on custom topic
- Add support for streaming from custom routing key or appended topic

## [0.6.1](https://github.com/space-bunny/node-sdk/releases/tag/v0.6.1)

#### Changed

- Add support for secure configurations API

## [0.6.0](https://github.com/space-bunny/node-sdk/releases/tag/v0.6.0)

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
