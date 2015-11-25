'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _mqtt = require('mqtt');

var _mqtt2 = _interopRequireDefault(_mqtt);

var _spacebunny = require('../spacebunny');

var _spacebunny2 = _interopRequireDefault(_spacebunny);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * A module that exports an MqttClient client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * which inherits from the SpaceBunny base client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * @module MqttClient
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

// Import some helpers modules

// Import mqtt library

// Import SpaceBunny main module from which MqttClient inherits

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */

var MqttClient = (function (_SpaceBunny) {
  _inherits(MqttClient, _SpaceBunny);

  function MqttClient(opts) {
    _classCallCheck(this, MqttClient);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MqttClient).call(this, opts));

    _this._client = undefined;
    _this._connectionOpts = { qos: 1 };
    _this._connectTimeout = 5000;
    _this.connection();
    return _this;
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is receviced
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */

  _createClass(MqttClient, [{
    key: 'onReceive',
    value: function onReceive(callback, opts) {
      var _this2 = this;

      // subscribe for input messages
      return new _bluebird2.default(function (resolve, reject) {
        _this2._connect().then(function (client) {
          client.subscribe(_this2._topicFor(_this2._inputTopic), (0, _merge2.default)(_this2._connectionOpts, opts), function (err) {
            if (err) {
              reject(false);
            } else {
              client.on('message', function (topic, message) {
                callback(topic, message);
              });
              resolve(true);
            }
          });
        }).catch(function (reason) {
          reject(reason);
        });
      });
    }

    /**
     * Publish a message on a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @param {Object} message - the message payload
     * @param {Object} message - the message payload
     * @return promise containing true if the
     */

  }, {
    key: 'publish',
    value: function publish(channel, message, opts) {
      var _this3 = this;

      // Publish message
      return new _bluebird2.default(function (resolve, reject) {
        _this3._connect().then(function (client) {
          client.on('connect', function () {
            var bufferedMessage = new Buffer(_this3._encapsulateContent(message));
            client.publish(_this3._topicFor(channel), bufferedMessage, (0, _merge2.default)(_this3._connectionOpts, opts), function () {
              resolve(true);
            });
          });
        }).catch(function (reason) {
          reject(reason);
        });
      });
    }

    /**
     * Destroy the connection between the mqtt client and broker
     *
     * @return a promise containing the result of the operation
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      var _this4 = this;

      return new _bluebird2.default(function (resolve, reject) {
        if (_this4._client === undefined) {
          reject('Invalid connection');
        } else {
          _this4._client.end().then(function () {
            resolve(true);
          }).catch(function (reason) {
            reject(reason);
          });
        }
      });
    }

    // ------------ PRIVATE METHODS -------------------

    /**
     * @private
     * Establish an mqtt connection with the broker
     * using configurations retrieved from the endpoint
     *
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */

  }, {
    key: '_connect',
    value: function _connect(opts) {
      var _this5 = this;

      opts = (0, _merge2.default)({}, opts);
      var connectionParams = this._connectionParams;

      return new _bluebird2.default(function (resolve, reject) {
        if (_this5._client !== undefined) {
          resolve(_this5._client);
        } else {
          try {
            var client = _mqtt2.default.connect({
              host: connectionParams.host,
              port: connectionParams.protocols.mqtt.port,
              username: connectionParams.vhost + ':' + connectionParams.device_id,
              password: connectionParams.secret,
              clientId: connectionParams.device_id,
              connectTimeout: opts.connectTimeout || _this5._connectTimeout
            });
            client.on('error', function (reason) {
              reject(reason);
            });
            client.on('close', function (reason) {
              reject(reason);
            });
            _this5._client = client;
            resolve(_this5._client);
          } catch (reason) {
            reject(reason);
          }
        }
      });
    }

    /**
     * @private
     * Generate the topic for a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_topicFor',
    value: function _topicFor(channel) {
      return this.deviceId().concat('/', channel);
    }
  }]);

  return MqttClient;
})(_spacebunny2.default);

exports.default = MqttClient;
//# sourceMappingURL=mqtt_client.js.map
