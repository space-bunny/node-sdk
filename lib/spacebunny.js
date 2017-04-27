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

// TODO validate enpointConfig object format with Joi
// import Joi from 'joi';

var CONFIG = require('../config/constants').CONFIG;

/**
 * @constructor
 * @param {Object} opts - constructor options may contain Device-Key or connection options
 */

var SpaceBunny = function () {
  function SpaceBunny() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, SpaceBunny);

    this._connectionParams = (0, _merge2.default)({}, _humps2.default.camelizeKeys(opts));
    this._endpointConfigs = undefined;
    this._endpointUrl = this._connectionParams.endpointUrl;
    this._deviceKey = this._connectionParams.deviceKey;
    this._channels = this._connectionParams.channels;
    this._deviceId = this._connectionParams.deviceId;
    this._client = this._connectionParams.client;
    this._secret = this._connectionParams.secret;
    this._host = this._connectionParams.host;
    this._port = this._connectionParams.port;
    this._vhost = this._connectionParams.vhost;
    this._protocol = CONFIG.protocol;
    this._inboxTopic = this._connectionParams.inputTopic || CONFIG.inboxTopic;
    this._liveStreamSuffix = CONFIG.liveStreamSuffix;
    this._tempQueueSuffix = CONFIG.tempQueueSuffix;
    this._liveStreams = [];
    this._tls = this._connectionParams.tls || false;
    this._tlsOpts = {};
    if (this._connectionParams.cert) {
      this._tlsOpts.cert = _fs2.default.readFileSync(this._connectionParams.cert);
    }
    if (this._connectionParams.key) {
      this._tlsOpts.key = _fs2.default.readFileSync(this._connectionParams.key);
    }
    if (this._connectionParams.passphrase) {
      this._tlsOpts.passphrase = this._connectionParams.passphrase;
    }
    if (this._connectionParams.ca) {
      if (Array.isArray(this._connectionParams.ca)) {
        this._tlsOpts.ca = this._connectionParams.ca.map(function (element) {
          return _fs2.default.readFileSync(element);
        });
      } else {
        this._tlsOpts.ca = [_fs2.default.readFileSync(this._connectionParams.ca)];
      }
    }
    if (this._connectionParams.pfx) {
      this._tlsOpts.pfx = _fs2.default.readFileSync(this._connectionParams.pfx);
    }
    if (this._connectionParams.disableCertCheck) {
      this._tlsOpts.rejectUnauthorized = false;
    } else {
      this._tlsOpts.rejectUnauthorized = true;
    }
    this._tlsOpts.secureProtocol = this._connectionParams.secureProtocol || CONFIG.tls.secureProtocol;
  }

  /**
   * Check if Device-Key or connection parameters have already been passed
   * If at least Device-Key is passed ask the endpoint for the configurations
   * else if also connection parameters are not passed raise an exception
   *
   * @return an Object containing the connection parameters
   */


  _createClass(SpaceBunny, [{
    key: 'getEndpointConfigs',
    value: function getEndpointConfigs() {
      var _this = this;

      return new _bluebird2.default(function (resolve, reject) {
        // Resolve with configs if already retrieved
        if (_this._endpointConfigs !== undefined) {
          resolve(_this._endpointConfigs);
        }
        // Contact endpoint to retrieve configs
        // Switch endpoint if you are using sdk as device or as access key stream
        var endpoint = '';
        if (_this._deviceId && _this._secret || _this._deviceKey) {
          // Device credentials
          endpoint = CONFIG.deviceEndpoint;
          // uses endpoint passed from user, default endpoint otherwise
          var hostname = _this._generateHostname(endpoint);
          var uri = '' + hostname + endpoint.api_version + endpoint.path;
          if (_this._deviceKey) {
            // Get configs from endpoint
            var options = {
              url: uri,
              method: 'get',
              responseType: 'json',
              headers: {
                'Device-Key': _this._deviceKey,
                'Content-Type': 'application/json'
              }
            };
            (0, _axios2.default)(options).then(function (response) {
              _this._endpointConfigs = _humps2.default.camelizeKeys(response.data);
              _this._connectionParams = _this._endpointConfigs.connection;
              resolve(_this._endpointConfigs);
            }).catch(function (err) {
              reject(err);
            });
          } else if (_this._deviceId && _this._secret && _this._host && _this._port && _this._vhost) {
            // Manually provided configs
            _this._connectionParams.protocols = {};
            if (_this._tls) {
              _this._connectionParams.protocols[_this._protocol] = { tlsPort: _this._port };
            } else {
              _this._connectionParams.protocols[_this._protocol] = { port: _this._port };
            }
            _this._endpointConfigs = {
              connection: _this._connectionParams,
              channels: []
            };
            resolve(_this._endpointConfigs);
          }
        } else if (_this._client && _this._secret) {
          // Access key credentials
          if (_this._host && _this._port && _this._vhost) {
            // Manually provided configs
            _this._connectionParams.protocols = {};
            if (_this._tls) {
              _this._connectionParams.protocols[_this._protocol] = { tlsPort: _this._port };
            } else {
              _this._connectionParams.protocols[_this._protocol] = { port: _this._port };
            }
            _this._endpointConfigs = {
              connection: _this._connectionParams,
              liveStreams: []
            };
            resolve(_this._endpointConfigs);
          } else {
            // Get configs from endpoint
            endpoint = CONFIG.accessKeyEndpoint;
            // uses endpoint passed from user, default endpoint otherwise
            var _hostname = _this._generateHostname(endpoint);
            var _uri = '' + _hostname + endpoint.api_version + endpoint.path;
            var _options = {
              url: _uri,
              method: 'get',
              responseType: 'json',
              headers: {
                'Live-Stream-Key-Client': _this._client,
                'Live-Stream-Key-Secret': _this._secret,
                'Content-Type': 'application/json'
              }
            };
            (0, _axios2.default)(_options).then(function (response) {
              _this._endpointConfigs = _humps2.default.camelizeKeys(response.data);
              _this._connectionParams = _this._endpointConfigs.connection;
              _this._liveStreams = _this._endpointConfigs.liveStreams || [];
              resolve(_this._endpointConfigs);
            }).catch(function (err) {
              reject(err);
            });
          }
        } else {
          // No configs or missing some info
          reject('Missing Device Key or wrong connection parameters');
        }
      });
    }

    /**
     * @return all channels configured for the current device
     */

  }, {
    key: 'channels',
    value: function channels() {
      if (this._endpointConfigs.channels) {
        this._channels = this._endpointConfigs.channels.map(function (obj) {
          return obj.name;
        });
        return this._channels || [];
      } else {
        return [];
      }
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
      var liveStreams = (0, _filter3.default)(this._liveStreams, function (stream) {
        return stream.name === streamName;
      });
      if (liveStreams.length > 0) {
        return liveStreams[0].id || streamName;
      } else {
        return streamName;
      }
    }

    /**
     * Check if a stream exists
     *
     * @param {String} streamName - stream name
     * @return true if stream exists, false otherwise
     */

  }, {
    key: 'liveStreamExists',
    value: function liveStreamExists(streamName) {
      var liveStreams = (0, _filter3.default)(this._liveStreams, function (stream) {
        return stream.name === streamName;
      });
      return liveStreams.length > 0;
    }

    /**
     * Generate a temporary queue name
     *
     * @private
     * @param {String} prefix - client id or stream name
     * @param {String} suffix - channel name or defaul live stream suffix
     * @param {Numeric} currentTime - current timestamp
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: 'tempQueue',
    value: function tempQueue(prefix, suffix, currentTime) {
      var timestamp = currentTime || new Date().getTime();
      return timestamp + '-' + this._connectionParams.client + '-' + (this.exchangeName(prefix, suffix) + '.') + ('' + this._tempQueueSuffix);
    }

    /**
     * Generate the exchange name for a device's channel
     *
     * @private
     * @param {String} prefix - It could be a device id or a stream name
     * @param {String} suffix - It could be a channel name or a the default stream suffix (live_stream)
     * @return a string that represents the complete exchange name
     */

  }, {
    key: 'exchangeName',
    value: function exchangeName(prefix, suffix) {
      return prefix && suffix ? this.liveStreamByName(prefix) + '.' + suffix : '' + suffix;
    }

    // ------------ PRIVATE METHODS -------------------

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
     * Generate the complete hostname string for an endpoint
     *
     * @private
     * @return the string representing the endpoint url
     */

  }, {
    key: '_generateHostname',
    value: function _generateHostname(endpoint) {
      var hostname = '' + (this._endpointUrl || endpoint.url);
      // const endpointProtocol = (this._tls) ? CONFIG.endpoint.secureProtocol : CONFIG.endpoint.protocol;
      var endpointProtocol = CONFIG.endpoint.protocol;
      if (!(0, _startsWith3.default)(hostname, endpointProtocol)) {
        hostname = endpointProtocol + '://' + hostname;
      }
      return hostname;
    }

    /**
     * Automatically parse message content
     *
     * @private
     * @param {Object/String} message - the received message
     * @return an object containing the input message with parsed content
     */

  }, {
    key: '_parseContent',
    value: function _parseContent(message) {
      var parsedMessage = message;
      if (Buffer.isBuffer(parsedMessage)) {
        parsedMessage = parsedMessage.toString('utf-8');
      }
      var res = undefined;
      try {
        res = JSON.parse(parsedMessage);
      } catch (ex) {
        res = parsedMessage;
      }
      return res;
    }
  }]);

  return SpaceBunny;
}();

exports.default = SpaceBunny;
//# sourceMappingURL=spacebunny.js.map
