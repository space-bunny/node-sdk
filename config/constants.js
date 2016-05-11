'use strict';

exports.CONFIG = {
  endpoint: {
    protocol: 'http',
    secureProtocol: 'https'
  },
  deviceEndpoint: {
    url: 'https://api.spacebunny.io',
    api_version: '/v1',
    path: '/device_configurations'
  },
  accessKeyEndpoint: {
    url: 'https://api.spacebunny.io',
    api_version: '/v1',
    path: '/live_stream_key_configurations'
  },
  ssl: {
    secureProtocol: 'TLSv1_2_method'
  },
  fromApiHeader: 'x-from-sb-api',
  protocol: 'amqp',
  inboxTopic: 'inbox',
  liveStreamSuffix: 'live_stream',
  tempQueueSuffix: 'temp',
  amqp: {
    ackTypes: ['auto', 'manual'],
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
    ackTypes: ['client'],
    connection: {
      headers: {
        max_hbrlck_fails: 10,
        'accept-version': '1.0,1.1,1.2',
        'heart-beat': '10000,10000'
      },
      opts: {}
    },
    existingQueuePrefix: 'amq/queue',
    stream: {
      exchangePrefix: 'exchange',
      defaultPattern: '#'
    }
  },
  webStomp: {
    ackTypes: ['client'],
    webSocket: {
      protocol: 'ws',
      ssl: {
        protocol: 'wss',
      },
      endpoint: 'ws'
    }
  }
};
