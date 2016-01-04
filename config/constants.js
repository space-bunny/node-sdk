'use strict';
if (typeof process === 'object' && process + '' === '[object process]') {
  // Node process
  require('dotenv').config({ path: __dirname + '/../.env' });
}
var env = process.env.NODE_ENV;
var url = (env == 'development') ? 'http://localhost:3000' : 'http://demo.spacebunny.io';
exports = {
  CONFIG: {
    deviceEndpoint: {
      url: url,
      api_version: '/v1',
      path: '/device_configurations'
    },
    accessKeyEndpoint: {
      url: url,
      api_version: '/v1',
      path: '/access_key_configurations'
    }
  }
};
