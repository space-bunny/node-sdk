const CONFIG = {
  endpoint: {
    protocol: 'http',
    secureProtocol: 'https',
    host: 'api.spacebunny.io',
    port: 80,
    securePort: 443,
    deviceConfigurationsPath: 'device_configurations',
    liveStreamKeyConfigurationsPath: 'live_stream_key_configurations'
  },
  tls: {
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
    tls: {
      protocol: 'amqps'
    },
    connection: {
      opts: {}
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
    tls: {
      protocol: 'mqtts',
      rejectUnauthorized: true
    },
    connection: {
      opts: { qos: 1, clean: true },
      timeout: 5000
    },
    stream: {
      defaultStreamRoutingKey: '#'
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
    defaultResource: 'exchange',
    stream: {
      exchangePrefix: 'exchange',
      defaultPattern: '#'
    }
  },
  webStomp: {
    ackTypes: ['client'],
    webSocket: {
      protocol: 'ws',
      tls: {
        protocol: 'wss',
      },
      endpoint: 'ws'
    }
  }
};

export default CONFIG;
