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

var _mqtt_client = require('./mqtt_client');

var _mqtt_client2 = _interopRequireDefault(_mqtt_client);

var _spacebunny_errors = require('../spacebunny_errors');

var _spacebunny_errors2 = _interopRequireDefault(_spacebunny_errors);

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

var MqttStreamClient = (function (_MqttClient) {
  _inherits(MqttStreamClient, _MqttClient);

  function MqttStreamClient(opts) {
    _classCallCheck(this, MqttStreamClient);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(MqttStreamClient).call(this, opts));
  }

  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */

  _createClass(MqttStreamClient, [{
    key: 'streamFrom',
    value: function streamFrom(streamHooks, opts) {
      var _this2 = this;

      var emptyFunction = function emptyFunction() {
        return undefined;
      };
      streamHooks.forEach(function (streamHook) {
        var deviceId = streamHook.deviceId;
        var channel = streamHook.channel;
        var qos = streamHook.qos;
        if (deviceId === undefined || channel === undefined) {
          throw new _spacebunny_errors2.default.MissingStreamConfigurations('Missing Device ID or Channel');
        }
        _this2._topics[_this2._streamTopicFor(deviceId, channel)] = qos || _this2._connectionOpts.qos;
      });
      return new _bluebird2.default(function (resolve, reject) {
        _this2.connect().then(function (mqttClient) {
          mqttClient.subscribe(_this2._topics, (0, _merge2.default)(_this2._connectionOpts, opts), function (err) {
            if (err) {
              reject(false);
            } else {
              mqttClient.on('message', function (topic, message) {
                var splitted = topic.split('/');
                var callback = streamHooks.filter(function (streamHook) {
                  return streamHook.deviceId === splitted[0] && streamHook.channel === splitted[1];
                })[0].callback || emptyFunction;
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

    // ------------ PRIVATE METHODS -------------------

    /**
     * @private
     * Generate the topic for a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_streamTopicFor',
    value: function _streamTopicFor(deviceId, channel) {
      return deviceId + '/' + channel;
    }
  }]);

  return MqttStreamClient;
})(_mqtt_client2.default);

// Remove unwnated methods inherited from MqttClient

delete MqttStreamClient.onReceive;
delete MqttStreamClient.publish;
delete MqttStreamClient._topicFor;

exports.default = MqttStreamClient;
//# sourceMappingURL=mqtt_stream_client.js.map
