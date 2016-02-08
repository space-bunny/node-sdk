'use strict';

exports.CONFIG = {
  protocol: 'http',
  secureProtocol: 'https',
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
  ackTypes: ['auto', 'manual'],
  inputExchange: 'input'
};
