'use strict';

var define = require("node-constants")(exports);

// or multiple
define({
    CONFIG: {
      endpoint: {
        url: 'localhost:3000', // 'https://api.spacebunny.io',
        api_version: '/v1',
        path: '/device_configurations'
      }      
    }

});
