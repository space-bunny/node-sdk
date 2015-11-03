'use strict';

require('source-map-support/register');

var _stomp_client = require('./protocols/stomp_client');

var _stomp_client2 = _interopRequireDefault(_stomp_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

window.StompClient = _stomp_client2.default;
//# sourceMappingURL=web_index.js.map
