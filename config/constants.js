'use strict';
if (typeof process === 'object' && process + '' === '[object process]') {
  // Node process
  require('dotenv').config({ path: __dirname + '/../.env' });
}
var define = require('node-constants')(exports);
var env = process.env.NODE_ENV;
var url = (env == 'development') ? 'http://localhost:3000' : 'http://demo.spacebunny.io';
define({
  CONFIG: {
    endpoint: {
      url: url,
      api_version: '/v1',
      path: '/device_configurations'
    }
  }
});
