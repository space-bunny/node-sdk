'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        * A module that exports the base SpaceBunny client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        * @module SpaceBunny
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        */

// Import some helpers modules

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _syncRequest = require('sync-request');

var _syncRequest2 = _interopRequireDefault(_syncRequest);

var _humps = require('humps');

var _humps2 = _interopRequireDefault(_humps);

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
    this._client = this._connectionParams.client;
    this._secret = this._connectionParams.secret;
    this._host = this._connectionParams.host;
    this._port = this._connectionParams.port;
    this._vhost = this._connectionParams.vhost;
    this._protocol = 'amqp';
    this._inputTopic = this._connectionParams.inputTopic || 'inbox';
    this._ssl = this._connectionParams.ssl || false;
    this._sslOpts = {};
    if (this._connectionParams.cert) {
      this._sslOpts.cert = _fs2.default.readFileSync(this._connectionParams.cert);
    }
    if (this._connectionParams.key) {
      this._sslOpts.key = _fs2.default.readFileSync(this._connectionParams.key);
    }
    if (this._connectionParams.passphrase) {
      this._sslOpts.passphrase = this._connectionParams.passphrase;
    }
    if (this._connectionParams.ca) {
      this._sslOpts.ca = [_fs2.default.readFileSync(this._connectionParams.ca)];
    }
    if (this._connectionParams.pfx) {
      this._sslOpts.pfx = _fs2.default.readFileSync(this._connectionParams.pfx);
    }
    this._sslOpts.secureProtocol = this._connectionParams.secureProtocol || 'TLSv1_method';
  }

  /**
   * Check if api-key or connection parameters have already been passed
   * If at least api-key is passed ask the endpoint for the configurations
   * else if also connection parameters are not passed raise an exception
   *
   * @return an Object containing the connection parameters
   */

  _createClass(SpaceBunny, [{
    key: 'getConnectionParams',
    value: function getConnectionParams() {
      // Contact endpoint to retrieve configs
      // Switch endpoint if you are using sdk as device or as access key stream
      var endpoint = '';
      if (this._deviceId && this._secret || this._apiKey) {
        // Device credentials
        endpoint = CONFIG.deviceEndpoint;
        var uri = '' + endpoint.url + endpoint.api_version + endpoint.path;
        if (this._apiKey) {
          // Get configs from endpoint
          try {
            var args = { headers: { 'Api-Key': this._apiKey } };
            var response = (0, _syncRequest2.default)('GET', uri, args);
            this._endPointConfigs = JSON.parse(response.getBody());
            this._connectionParams = _humps2.default.camelizeKeys(this._endPointConfigs.connection);
          } catch (ex) {
            throw new _spacebunny_errors2.default.EndPointError(ex);
          }
        } else if (this._deviceId && this._secret && this._host && this._port && this._vhost) {
          // Manually provided configs
          this._connectionParams.protocols = {};
          if (this._ssl) {
            this._connectionParams.protocols[this._protocol] = { sslPort: this._port };
          } else {
            this._connectionParams.protocols[this._protocol] = { port: this._port };
          }
        }
      } else if (this._client && this._secret) {
        // Access key credentials
        if (this._host && this._port && this._vhost) {
          // Manually provided configs
          this._connectionParams.protocols = {};
          if (this._ssl) {
            this._connectionParams.protocols[this._protocol] = { sslPort: this._port };
          } else {
            this._connectionParams.protocols[this._protocol] = { port: this._port };
          }
        } else {
          // Get configs from endpoint
          try {
            endpoint = CONFIG.accessKeyEndpoint;
            var uri = '' + endpoint.url + endpoint.api_version + endpoint.path;
            var args = { headers: { 'Access-Key-Client': this._client, 'Access-Key-Secret': this._secret } };
            var response = (0, _syncRequest2.default)('GET', uri, args);
            this._endPointConfigs = JSON.parse(response.getBody());
            this._connectionParams = _humps2.default.camelizeKeys(this._endPointConfigs.connection);
          } catch (ex) {
            throw new _spacebunny_errors2.default.EndPointError(ex);
          }
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
      if (this._channels === undefined) {
        this._channels = this._endPointConfigs.channels.map(function (obj) {
          return obj.name;
        });
      }
      return this._channels || [];
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

    /**
     * Generate the exchange name for a device's channel
     *
     * @private
     * @param {String} deviceId - Device id from which you want to stream
     * @param {String} channel - channel name from which you want to stream
     * @return a string that represents the complete exchange name
     */

  }, {
    key: '_channelExchange',
    value: function _channelExchange(deviceId, channel) {
      return deviceId + '.' + channel;
    }

    /**
     * Encapsulates contens for publishing messages.
     * If the content is a valid JSON the function stringifies the content
     *
     * @private
     * @param {Object} content - content to publish, could be a string or a JSON object
     * @return the content encapsulated in the proper way
     */

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

    /**
     * Check if the required parameters are present to open a secure connection
     *
     * @private
     * @return true when a combination of valid parameters is present, false otherwise
     */

  }, {
    key: '_checkSslOptions',
    value: function _checkSslOptions() {
      var sslOpts = this._sslOpts;
      if (sslOpts.ca) {
        if (sslOpts.cert && sslOpts.key) {
          return true;
        } else if (sslOpts.pfx) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
  }]);

  return SpaceBunny;
})();

exports.default = SpaceBunny;
//# sourceMappingURL=spacebunny.js.map
