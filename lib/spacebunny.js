'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _filter2 = require('lodash/filter');

var _filter3 = _interopRequireDefault(_filter2);

var _startsWith2 = require('lodash/startsWith');

var _startsWith3 = _interopRequireDefault(_startsWith2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * A module that exports the base SpaceBunny client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * @module SpaceBunny
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */

// Import some helpers modules


var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _humps = require('humps');

var _humps2 = _interopRequireDefault(_humps);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CONFIG = require('../config/constants').CONFIG;

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */

var SpaceBunny = function () {
  function SpaceBunny() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, SpaceBunny);

    this._connectionParams = (0, _merge2.default)({}, _humps2.default.camelizeKeys(opts));
    this._endpointConfigs = {};
    this._endpointUrl = this._connectionParams.endpointUrl;
    this._apiKey = this._connectionParams.apiKey;
    this._channels = this._connectionParams.channels;
    this._deviceId = this._connectionParams.deviceId;
    this._client = this._connectionParams.client;
    this._secret = this._connectionParams.secret;
    this._host = this._connectionParams.host;
    this._port = this._connectionParams.port;
    this._vhost = this._connectionParams.vhost;
    this._protocol = 'amqp';
    this._inputTopic = this._connectionParams.inputTopic || 'inbox';
    this._liveStreamSuffix = 'live_stream';
    this._liveStreams = [];
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

  // TODO this function should return a Promise!! Need to be async
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
      var _this = this;

      return new _bluebird2.default(function (resolve, reject) {
        // Contact endpoint to retrieve configs
        // Switch endpoint if you are using sdk as device or as access key stream
        var endpoint = '';
        if (_this._deviceId && _this._secret || _this._apiKey) {
          // Device credentials
          endpoint = CONFIG.deviceEndpoint;
          // uses endpoint passed from user, default endpoint otherwise
          var hostname = _this._generateHostname(endpoint);
          var uri = '' + hostname + endpoint.api_version + endpoint.path;
          if (_this._apiKey) {
            // Get configs from endpoint
            var options = { url: uri, method: 'get', headers: { 'Api-Key': _this._apiKey }, responseType: 'json' };
            (0, _axios2.default)(options).then(function (response) {
              _this._endpointConfigs = _humps2.default.camelizeKeys(response.data);
              _this._connectionParams = _this._endpointConfigs.connection;
              resolve(_this._connectionParams);
            }).catch(function (err) {
              reject(err);
            });
          } else if (_this._deviceId && _this._secret && _this._host && _this._port && _this._vhost) {
            // Manually provided configs
            _this._connectionParams.protocols = {};
            if (_this._ssl) {
              _this._connectionParams.protocols[_this._protocol] = { sslPort: _this._port };
            } else {
              _this._connectionParams.protocols[_this._protocol] = { port: _this._port };
            }
            resolve(_this._connectionParams);
          }
        } else if (_this._client && _this._secret) {
          // Access key credentials
          if (_this._host && _this._port && _this._vhost) {
            // Manually provided configs
            _this._connectionParams.protocols = {};
            if (_this._ssl) {
              _this._connectionParams.protocols[_this._protocol] = { sslPort: _this._port };
            } else {
              _this._connectionParams.protocols[_this._protocol] = { port: _this._port };
            }
            resolve(_this._connectionParams);
          } else {
            // Get configs from endpoint
            endpoint = CONFIG.accessKeyEndpoint;
            // uses endpoint passed from user, default endpoint otherwise
            var _hostname = _this._generateHostname(endpoint);
            var _uri = '' + _hostname + endpoint.api_version + endpoint.path;
            var _options = {
              url: _uri,
              method: 'get',
              headers: { 'Access-Key-Client': _this._client, 'Access-Key-Secret': _this._secret },
              responseType: 'json'
            };
            (0, _axios2.default)(_options).then(function (response) {
              _this._endpointConfigs = _humps2.default.camelizeKeys(response.data);
              _this._connectionParams = _this._endpointConfigs.connection;
              _this._liveStreams = _this._endpointConfigs.liveStreams || [];
              resolve(_this._connectionParams);
            }).catch(function (err) {
              reject(err);
            });
          }
        } else {
          // No configs or missing some info
          reject('Missing Api Key or wrong connection parameters');
        }
      });
    }

    /**
     * @return all channels configured for the current device
     */

  }, {
    key: 'channels',
    value: function channels() {
      if (this._channels === undefined) {
        this._channels = this._endpointConfigs.channels.map(function (obj) {
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

    /**
     * Return a Stream ID from a stream name given in input
     *
     * @param {String} streamName - stream name
     * @return the stream ID which corresponds to the input stream name
     */

  }, {
    key: 'liveStreamByName',
    value: function liveStreamByName(streamName) {
      var liveStream = (0, _filter3.default)(this._liveStreams, function (stream) {
        return stream.name === streamName;
      });
      return liveStream[0].id || streamName;
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
      return deviceId && channel ? deviceId + '.' + channel : '' + channel;
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
  }, {
    key: '_generateHostname',
    value: function _generateHostname(endpoint) {
      var hostname = '' + (this._endpointUrl || endpoint.url);
      var endpointProtocol = this._ssl ? CONFIG.secureProtocol : CONFIG.protocol;
      if (!(0, _startsWith3.default)(hostname, endpointProtocol)) {
        hostname = endpointProtocol + '://' + hostname;
      }
      return hostname;
    }
  }]);

  return SpaceBunny;
}();

exports.default = SpaceBunny;
//# sourceMappingURL=spacebunny.js.map
