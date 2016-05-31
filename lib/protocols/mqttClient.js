'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _isEmpty2 = require('lodash/isEmpty');

var _isEmpty3 = _interopRequireDefault(_isEmpty2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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


var CONFIG = require('../../config/constants').CONFIG;

var MqttClient = function (_SpaceBunny) {
  _inherits(MqttClient, _SpaceBunny);

  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */

  function MqttClient(opts) {
    _classCallCheck(this, MqttClient);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MqttClient).call(this, opts));

    _this._topics = {};
    _this._mqttConnection = undefined;
    _this._subscription = undefined;
    var mqttOptions = CONFIG.mqtt;
    _this._protocol = mqttOptions.protocol;
    _this._tlsOpts.protocol = mqttOptions.tls.protocol;
    _this._tlsOpts.rejectUnauthorized = mqttOptions.tls.rejectUnauthorized;
    _this._connectionOpts = mqttOptions.connection.opts;
    _this._connectionTimeout = mqttOptions.connection.timeout;
    return _this;
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is received
   * passing the current message as argument
   * @param {Object} options - subscription options
   * @return promise containing the result of the subscription
   */


  _createClass(MqttClient, [{
    key: 'onReceive',
    value: function onReceive(callback, opts) {
      var _this2 = this;

      opts = (0, _merge2.default)({}, opts);
      // subscribe for input messages
      return new _bluebird2.default(function (resolve, reject) {
        _this2.connect().then(function (client) {
          _this2._topics[_this2._topicFor(_this2._inboxTopic)] = opts.qos || _this2._connectionOpts.qos;
          client.subscribe(_this2._topics, (0, _merge2.default)(_this2._connectionOpts, opts), function (err) {
            if (err) {
              reject(false);
            } else {
              client.on('message', function (topic, message) {
                // TODO filterMine and filterWeb
                callback(topic, _this2._parseContent(message));
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
     * @param {Object/String} message - the message payload
     * @param {Object} opts - publication options
     * @return a promise containing the result of the operation
     */

  }, {
    key: 'publish',
    value: function publish(channel, message, opts) {
      var _this3 = this;

      // Publish message
      return new _bluebird2.default(function (resolve, reject) {
        _this3.connect().then(function (client) {
          var _sendMessage = function _sendMessage() {
            var bufferedMessage = new Buffer(_this3._encapsulateContent(message));
            client.publish(_this3._topicFor(channel), bufferedMessage, (0, _merge2.default)(_this3._connectionOpts, opts), function () {
              resolve(true);
            });
          };
          if (!client.connected) {
            client.on('connect', function () {
              _sendMessage();
            });
          } else {
            _sendMessage();
          }
        }).catch(function (reason) {
          reject(reason);
        });
      });
    }

    /**
     * Unsubscribe client from a list of topics
     *
     * @param {Object} topics - list of topics { topic: qos, ... }
     * e.g. { topic_1: 1, topic_2: 0 }
     * @return a promise containing the result of the operation
     */

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(topics) {
      var _this4 = this;

      return new _bluebird2.default(function (resolve, reject) {
        try {
          if ((0, _isEmpty3.default)(topics)) {
            resolve(true);
          } else {
            _this4._mqttConnection.unsubscribe(Object.keys(topics), function () {
              resolve(true);
            });
          }
        } catch (reason) {
          reject(reason);
        }
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
      var _this5 = this;

      return new _bluebird2.default(function (resolve, reject) {
        if (_this5._mqttConnection === undefined) {
          reject('Invalid connection');
        } else {
          (function () {
            var _closeConnection = function _closeConnection() {
              _this5._mqttConnection.end(true, function () {
                _this5._mqttConnection = undefined;
                resolve(true);
              });
            };
            try {
              if ((0, _isEmpty3.default)(_this5._topics)) {
                _closeConnection();
              } else {
                _this5._mqttConnection.unsubscribe(Object.keys(_this5._topics), function () {
                  _closeConnection();
                });
              }
            } catch (reason) {
              reject(reason);
            }
          })();
        }
      });
    }

    /**
     * Establish an mqtt connection with the broker.
     * If a connection already exists, returns the current connection
     *
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */

  }, {
    key: 'connect',
    value: function connect() {
      var _this6 = this;

      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      opts = (0, _merge2.default)(this._connectionOpts, opts);

      return new _bluebird2.default(function (resolve, reject) {
        _this6.getEndpointConfigs().then(function (endpointConfigs) {
          var connectionParams = endpointConfigs.connection;
          if (_this6._mqttConnection !== undefined) {
            resolve(_this6._mqttConnection);
          } else {
            try {
              var mqttConnectionParams = {
                host: connectionParams.host,
                port: _this6._tls ? connectionParams.protocols.mqtt.tlsPort : connectionParams.protocols.mqtt.port,
                username: connectionParams.vhost + ':' + (connectionParams.deviceId || connectionParams.client),
                password: connectionParams.secret,
                clientId: connectionParams.deviceId || connectionParams.client,
                connectionTimeout: opts.connectionTimeout || _this6._connectionTimeout
              };
              if (_this6._tls) {
                mqttConnectionParams = (0, _merge2.default)(mqttConnectionParams, _this6._tlsOpts);
              }
              var client = _mqtt2.default.connect(mqttConnectionParams);
              client.on('error', function (reason) {
                reject(reason);
              });
              client.on('close', function (reason) {
                reject(reason);
              });
              _this6._mqttConnection = client;
              resolve(_this6._mqttConnection);
            } catch (reason) {
              reject(reason);
            }
          }
        }).catch(function (reason) {
          reject(reason);
        });
      });
    }

    // ------------ PRIVATE METHODS -------------------

    /**
     * Generate the topic for a specific channel
     *
     * @private
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_topicFor',
    value: function _topicFor(channel) {
      return this.deviceId() + '/' + channel;
    }
  }]);

  return MqttClient;
}(_spacebunny2.default);

exports.default = MqttClient;
//# sourceMappingURL=mqttClient.js.map
