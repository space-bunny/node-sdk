'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _filter2 = require('lodash/filter');

var _filter3 = _interopRequireDefault(_filter2);

var _startsWith2 = require('lodash/startsWith');

var _startsWith3 = _interopRequireDefault(_startsWith2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * A module that exports the base SpaceBunny client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * @module SpaceBunny
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

// Import some helpers modules


// TODO validate enpointConfig object format with Joi
// import Joi from 'joi';

var CONFIG = require('../config/constants').CONFIG;

/**
 * @constructor
 * @param {Object} opts - constructor options may contain Device-Key or connection options
 */

var SpaceBunny = function (_EventEmitter) {
  _inherits(SpaceBunny, _EventEmitter);

  function SpaceBunny() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, SpaceBunny);

    var _this = _possibleConstructorReturn(this, (SpaceBunny.__proto__ || Object.getPrototypeOf(SpaceBunny)).call(this));

    _this._connectionParams = (0, _merge2.default)({}, _humps2.default.camelizeKeys(opts));
    _this._endpointConfigs = undefined;
    _this._endpoint = (0, _merge2.default)(CONFIG.endpoint, _this._connectionParams.endpoint);
    _this._deviceKey = _this._connectionParams.deviceKey;
    _this._channels = _this._connectionParams.channels;
    _this._deviceId = _this._connectionParams.deviceId;
    _this._client = _this._connectionParams.client;
    _this._secret = _this._connectionParams.secret;
    _this._host = _this._connectionParams.host;
    _this._port = _this._connectionParams.port;
    _this._vhost = _this._connectionParams.vhost;
    _this._protocol = CONFIG.protocol;
    _this._inboxTopic = _this._connectionParams.inputTopic || CONFIG.inboxTopic;
    _this._liveStreamSuffix = CONFIG.liveStreamSuffix;
    _this._tempQueueSuffix = CONFIG.tempQueueSuffix;
    _this._liveStreams = [];
    _this._tls = _this._connectionParams.tls || false;
    _this._tlsOpts = {};
    if (_this._connectionParams.cert) {
      _this._tlsOpts.cert = _fs2.default.readFileSync(_this._connectionParams.cert);
    }
    if (_this._connectionParams.key) {
      _this._tlsOpts.key = _fs2.default.readFileSync(_this._connectionParams.key);
    }
    if (_this._connectionParams.passphrase) {
      _this._tlsOpts.passphrase = _this._connectionParams.passphrase;
    }
    if (_this._connectionParams.ca) {
      if (Array.isArray(_this._connectionParams.ca)) {
        _this._tlsOpts.ca = _this._connectionParams.ca.map(function (element) {
          return _fs2.default.readFileSync(element);
        });
      } else {
        _this._tlsOpts.ca = [_fs2.default.readFileSync(_this._connectionParams.ca)];
      }
    }
    if (_this._connectionParams.pfx) {
      _this._tlsOpts.pfx = _fs2.default.readFileSync(_this._connectionParams.pfx);
    }
    if (_this._connectionParams.disableCertCheck) {
      _this._tlsOpts.rejectUnauthorized = false;
    } else {
      _this._tlsOpts.rejectUnauthorized = true;
    }
    _this._tlsOpts.secureProtocol = _this._connectionParams.secureProtocol || CONFIG.tls.secureProtocol;
    return _this;
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
      var _this2 = this;

      return new _bluebird2.default(function (resolve, reject) {
        // Resolve with configs if already retrieved
        if (_this2._endpointConfigs !== undefined) {
          resolve(_this2._endpointConfigs);
        }
        // Contact endpoint to retrieve configs
        // Switch endpoint if you are using sdk as device or as access key stream
        if (_this2._deviceId && _this2._secret || _this2._deviceKey) {
          // Device credentials
          // uses endpoint passed from user, default endpoint otherwise
          var hostname = _this2._generateHostname();
          var uri = _url2.default.resolve(hostname, _this2._endpoint.deviceConfigurationsPath);
          if (_this2._deviceKey) {
            // Get configs from endpoint
            var options = {
              url: uri,
              method: 'get',
              responseType: 'json',
              headers: {
                'Device-Key': _this2._deviceKey,
                'Content-Type': 'application/json'
              }
            };
            (0, _axios2.default)(options).then(function (response) {
              _this2._endpointConfigs = _humps2.default.camelizeKeys(response.data);
              _this2._connectionParams = _this2._endpointConfigs.connection;
              resolve(_this2._endpointConfigs);
            }).catch(function (err) {
              reject(err);
            });
          } else if (_this2._deviceId && _this2._secret && _this2._host && _this2._port && _this2._vhost) {
            // Manually provided configs
            _this2._connectionParams.protocols = {};
            if (_this2._tls) {
              _this2._connectionParams.protocols[_this2._protocol] = { tlsPort: _this2._port };
            } else {
              _this2._connectionParams.protocols[_this2._protocol] = { port: _this2._port };
            }
            _this2._endpointConfigs = {
              connection: _this2._connectionParams,
              channels: []
            };
            resolve(_this2._endpointConfigs);
          }
        } else if (_this2._client && _this2._secret) {
          // Access key credentials
          if (_this2._host && _this2._port && _this2._vhost) {
            // Manually provided configs
            _this2._connectionParams.protocols = {};
            if (_this2._tls) {
              _this2._connectionParams.protocols[_this2._protocol] = { tlsPort: _this2._port };
            } else {
              _this2._connectionParams.protocols[_this2._protocol] = { port: _this2._port };
            }
            _this2._endpointConfigs = {
              connection: _this2._connectionParams,
              liveStreams: []
            };
            resolve(_this2._endpointConfigs);
          } else {
            // Get configs from endpoint
            // uses endpoint passed from user, default endpoint otherwise
            var _hostname = _this2._generateHostname();
            var _uri = _url2.default.resolve(_hostname, _this2._endpoint.liveStreamKeyConfigurationsPath);
            var _options = {
              url: _uri,
              method: 'get',
              responseType: 'json',
              headers: {
                'Live-Stream-Key-Client': _this2._client,
                'Live-Stream-Key-Secret': _this2._secret,
                'Content-Type': 'application/json'
              }
            };
            (0, _axios2.default)(_options).then(function (response) {
              _this2._endpointConfigs = _humps2.default.camelizeKeys(response.data);
              _this2._connectionParams = _this2._endpointConfigs.connection;
              _this2._liveStreams = _this2._endpointConfigs.liveStreams || [];
              resolve(_this2._endpointConfigs);
            }).catch(function (err) {
              reject(err);
            });
          }
        } else {
          // No configs or missing some info
          reject(new Error('Missing Device Key or wrong connection parameters'));
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
      var deviceId = this._connectionParams.client || this._connectionParams.deviceId;
      return timestamp + '-' + deviceId + '-' + (this.exchangeName(prefix, suffix) + '.') + ('' + this._tempQueueSuffix);
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
    value: function _generateHostname() {
      if (this._endpoint.url) {
        return this._endpoint.url;
      }
      var hostname = this._endpoint.host + ':' + this._endpoint.port;
      var protocol = this._tls ? this._endpoint.secureProtocol : this._endpoint.protocol;
      if (!(0, _startsWith3.default)(hostname, protocol)) {
        hostname = protocol + '://' + hostname;
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
      var res = void 0;
      try {
        res = JSON.parse(parsedMessage);
      } catch (ex) {
        res = parsedMessage;
      }
      return res;
    }
  }]);

  return SpaceBunny;
}(_events2.default);

exports.default = SpaceBunny;
//# sourceMappingURL=spacebunny.js.map
