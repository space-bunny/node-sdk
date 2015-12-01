'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        * A module that exports the base SpaceBunny client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        * @module SpaceBunny
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        */

// Import some helpers modules

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _syncRequest = require('sync-request');

var _syncRequest2 = _interopRequireDefault(_syncRequest);

var _spacebunny_errors = require('./spacebunny_errors');

var _spacebunny_errors2 = _interopRequireDefault(_spacebunny_errors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CONFIG = require('../config/constants').CONFIG;

// Import Space Bunny errors

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */

var SpaceBunny = (function () {
  function SpaceBunny(opts) {
    _classCallCheck(this, SpaceBunny);

    this._connectionParams = (0, _merge2.default)({}, opts);
    this._endPointConfigs = {};
    this._channels = this._connectionParams.channels;
    this._apiKey = this._connectionParams.apiKey;
    this._deviceId = this._connectionParams.deviceId;
    this._secret = this._connectionParams.secret;
    this._host = this._connectionParams.host;
    this._port = this._connectionParams.port;
    this._vhost = this._connectionParams.vhost;
    this._protocol = 'amqp';
    this._ssl = this._connectionParams.ssl || false;
    this._inputTopic = this._connectionParams.inputTopic || 'inbox';
  }

  /**
   * Check if api-key or connection parameters have already been passed
   * If at least api-key is passed ask the endpoint for the configurations
   * else if also connection parameters are not passed raise an exception
   *
   * @return an Object containing the connection parameters
   */

  _createClass(SpaceBunny, [{
    key: 'connection',
    value: function connection() {
      // Contact endpoint to retrieve configs
      var uri = '' + CONFIG.endpoint.url + CONFIG.endpoint.api_version + CONFIG.endpoint.path;
      if (this._apiKey) {
        // Get configs from endpoint
        try {
          var args = { headers: { 'Api-Key': this._apiKey } };
          var response = (0, _syncRequest2.default)('GET', uri, args);
          this._endPointConfigs = JSON.parse(response.getBody());
          this._connectionParams = this._endPointConfigs.connection;
          this._connectionParams.deviceId = this._connectionParams.device_id;
        } catch (ex) {
          throw new _spacebunny_errors2.default.EndPointError(ex);
        }
      } else if (this._deviceId && this._secret && this._host && this._port && this._vhost) {
        // Manually provided configs
        this._connectionParams.protocols = {};
        if (this._ssl) {
          this._connectionParams.protocols[this._protocol] = { ssl_port: this._port };
        } else {
          this._connectionParams.protocols[this._protocol] = { port: this._port };
        }
      } else {
        // No configs or missing some info
        throw new _spacebunny_errors2.default.ApiKeyOrConfigurationsRequired('Missing Api Key or wrong connection parameters');
      }
    }

    /**
     * @return all channels configured for the current device
     */

  }, {
    key: 'channels',
    value: function channels() {
      this._channels = this._endPointConfigs.channels || this._channels || [];
      return this._channels.map(function (obj) {
        return obj.name;
      });
    }

    /**
     * @return the device ID for the current device
     */

  }, {
    key: 'deviceId',
    value: function deviceId() {
      this._deviceId = this._deviceId || this._connectionParams.deviceId;
      return this._deviceId;
    }

    // ------------ PRIVATE METHODS -------------------

  }, {
    key: '_encapsulateContent',
    value: function _encapsulateContent(content) {
      var encapsulatedContent = content;
      try {
        encapsulatedContent = JSON.stringify(content);
      } catch (ex) {
        encapsulatedContent = content;
      }
      return encapsulatedContent;
    }
  }]);

  return SpaceBunny;
})();

exports.default = SpaceBunny;
//# sourceMappingURL=spacebunny.js.map
