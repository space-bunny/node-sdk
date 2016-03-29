'use strict';

exports.CONFIG = {
  endpoint: {
    protocol: 'http',
    secureProtocol: 'https'
  },
  deviceEndpoint: {
    url: 'http://api.demo.spacebunny.io',
    api_version: '/v1',
    path: '/device_configurations'
  },
  accessKeyEndpoint: {
    url: 'http://api.demo.spacebunny.io',
    api_version: '/v1',
    path: '/access_key_configurations'
  },
  ssl: {
    secureProtocol: 'TLSv1_method'
  },
  ackTypes: ['auto', 'manual'],
  inputExchange: 'input',
  protocol: 'amqp',
  inboxTopic: 'inbox',
  liveStreamSuffix: 'live_stream',
  tempQueueSuffix: 'temp',
  amqp: {
    protocol: 'amqp',
    ssl: {
      protocol: 'amqps'
    },
    inputQueueArgs: {},
    deviceExchangeArgs: {},
    subscribeArgs: { noAck: true, requeue: false, allUpTo: false },
    publishArgs: { withConfirm: false },
    socketOptions: { frameMax: 32768, heartbeat: 60 },
    stream: {
      defaultStreamRoutingKey: '#',
      streamQueueArguments: { exclusive: true, autoDelete: true, durable: false }
    }
  },
  mqtt: {
    protocol: 'mqtt',
    ssl: {
      protocol: 'mqtts',
      rejectUnauthorized: true
    },
    connection: {
      opts: { qos: 1 },
      timeout: 5000
    }
  },
  stomp: {
    connection: {
      headers: {
        max_hbrlck_fails: 10,
        'accept-version': '1.0,1.1,1.2',
        'heart-beat': '10000,10000'
      }
    },
    existingQueuePrefix: 'amq/queue',
    stream: {
      exchangePrefix: 'exchange',
      defaultPattern: '#'
    }
  },
  webStomp: {
    webSocket: {
      protocol: 'ws',
      ssl: {
        protocol: 'wss',
      },
      enpoint: 'ws'
    }
  }
};
