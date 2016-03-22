'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

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


var MqttClient = function (_SpaceBunny) {
  _inherits(MqttClient, _SpaceBunny);

  /**
   * @constructor
   * @param {Object} opts - options must contain api-key or connection options
   * (deviceId and secret) for devices.
   */

  function MqttClient(opts) {
    _classCallCheck(this, MqttClient);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MqttClient).call(this, opts));

    _this._protocol = 'mqtt';
    _this._mqttConnection = undefined;
    _this._subscription = undefined;
    _this._connectionOpts = { qos: 1 };
    _this._connectTimeout = 5000;
    _this._topics = {};
    _this._sslOpts.protocol = 'mqtts';
    _this._sslOpts.rejectUnauthorized = true;
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
        _this2._connect().then(function (client) {
          _this2._topics[_this2._topicFor(_this2._inputTopic)] = opts.qos || _this2._connectionOpts.qos;
          client.subscribe(_this2._topics, (0, _merge2.default)(_this2._connectionOpts, opts), function (err) {
            if (err) {
              reject(false);
            } else {
              client.on('message', function (topic, message) {
                // TODO filterMine and filterWeb
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
        _this4._mqttConnection.unsubscribe(Object.keys(topics)).then(function () {
          resolve(true);
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
      var _this5 = this;

      return new _bluebird2.default(function (resolve, reject) {
        if (_this5._mqttConnection === undefined) {
          reject('Invalid connection');
        } else {
          _this5._mqttConnection.unsubscribe(_this5._topics).then(function () {
            _this5._mqttConnection.end().then(function () {
              _this5._mqttConnection = undefined;
              resolve(true);
            });
          }).catch(function (reason) {
            reject(reason);
          });
        }
      });
    }

    // ------------ PRIVATE METHODS -------------------

    /**
     * Establish an mqtt connection with the broker.
     * If a connection already exists, returns the current connection
     *
     * @private
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */

  }, {
    key: '_connect',
    value: function _connect(opts) {
      var _this6 = this;

      opts = (0, _merge2.default)({}, opts);
      var connectionParams = this._connectionParams;

      return new _bluebird2.default(function (resolve, reject) {
        _this6.getConnectionParams().then(function () {
          if (_this6._mqttConnection !== undefined) {
            resolve(_this6._mqttConnection);
          } else {
            try {
              var mqttConnectionParams = {
                host: connectionParams.host,
                port: _this6._ssl ? connectionParams.protocols.mqtt.sslPort : connectionParams.protocols.mqtt.port,
                username: connectionParams.vhost + ':' + (connectionParams.deviceId || connectionParams.client),
                password: connectionParams.secret,
                clientId: connectionParams.deviceId || connectionParams.client,
                connectTimeout: opts.connectTimeout || _this6._connectTimeout
              };
              if (_this6._ssl) {
                mqttConnectionParams = (0, _merge2.default)(mqttConnectionParams, _this6._sslOpts);
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
        });
      });
    }

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
