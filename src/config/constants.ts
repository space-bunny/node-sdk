import { IEndpoint } from 'src/spacebunny';

export interface IConstants {
  endpoint: IEndpoint;
  mqtt: IMqttContants;
  stomp: IStompConstants;
  webStomp: IWebStompConstants;
}

export interface IAmqpContants {
  ackTypes: string[];
  protocol: string;
  tls: { protocol: string };
  connection: { opts: object };
  deviceExchangeArgs: object;
  subscribeArgs: { noAck: boolean; requeue: boolean; allUpTo: boolean };
  publishArgs: { withConfirm: boolean };
  socketOptions: { frameMax: number; heartbeat: number };
  stream: {
    defaultStreamRoutingKey: string;
    streamQueueArguments: { exclusive: boolean; autoDelete: boolean; durable: boolean };
  };
}

export interface IMqttContants {
  protocol: string;
  tls: {
    protocol: string;
    rejectUnauthorized: boolean;
  };
  connection: {
    opts: { qos: 0|1|2; clean: boolean };
    timeout: number;
  };
  stream: {
    defaultStreamRoutingKey: string;
  };
}

export interface IStompConstants {
  ackTypes: string[];
  connection: {
    headers: {
      // eslint-disable-next-line @typescript-eslint/camelcase
      max_hbrlck_fails: number;
      'accept-version': string;
      'heart-beat': string;
    };
    opts: object;
  };
  existingQueuePrefix: string;
  defaultResource: string;
  stream: {
    exchangePrefix: string;
    defaultPattern: string;
  };
}

export interface IWebStompConstants {
  ackTypes: string[];
  webSocket: {
    protocol: string;
    tls: {
      protocol: string;
    };
    endpoint: string;
  };
}

const constants: IConstants = {
  endpoint: {
    protocol: 'http',
    secureProtocol: 'https',
    host: 'api.spacebunny.io',
    port: 80,
    securePort: 443,
    deviceConfigurationsPath: 'device_configurations',
    liveStreamKeyConfigurationsPath: 'live_stream_key_configurations'
  },
  // tls: {
  //   secureProtocol: 'TLSv1_2_method'
  // },
  mqtt: {
    protocol: 'mqtt',
    tls: {
      protocol: 'mqtts',
      rejectUnauthorized: true
    },
    connection: {
      opts: { qos: 2, clean: true },
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
        // eslint-disable-next-line @typescript-eslint/camelcase
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
export default constants;
