'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys2 = require('lodash/keys');

var _keys3 = _interopRequireDefault(_keys2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _mqttClient = require('./mqttClient');

var _mqttClient2 = _interopRequireDefault(_mqttClient);

var _spacebunnyErrors = require('../spacebunnyErrors');

var _spacebunnyErrors2 = _interopRequireDefault(_spacebunnyErrors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * A module that exports an MqttStreamClient client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * which inherits from the Mqtt base client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * @module MqttStreamClient
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

// Import some helpers modules


// Import MqttClient main module from which MqttStreamClient inherits


var MqttStreamClient = function (_MqttClient) {
  _inherits(MqttStreamClient, _MqttClient);

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */

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
        var stream = streamHook.stream;
        var deviceId = streamHook.deviceId;
        var channel = streamHook.channel;
        var qos = streamHook.qos;
        if (stream === undefined && (channel === undefined || deviceId === undefined)) {
          throw new _spacebunnyErrors2.default.MissingStreamConfigurations('Missing Stream or Device ID and Channel');
        }
        if (stream) {
          _this2._topics[_this2._streamTopicFor(stream)] = qos || _this2._connectionOpts.qos;
        } else {
          _this2._topics[_this2._streamChannelTopicFor(deviceId, channel)] = qos || _this2._connectionOpts.qos;
        }
      });
      return new _bluebird2.default(function (resolve, reject) {
        _this2._connect().then(function (mqttClient) {
          mqttClient.subscribe(_this2._topics, (0, _merge2.default)(_this2._connectionOpts, opts), function (err) {
            if (err) {
              reject(false);
            } else {
              console.log('streaming from ' + (0, _keys3.default)(_this2._topics)); // eslint-disable-line no-console
              mqttClient.on('message', function (topic, message) {
                var splitted = topic.split('/');
                var callback = streamHooks.filter(function (streamHook) {
                  return streamHook.stream === splitted[0] || streamHook.deviceId === splitted[0] && streamHook.channel === splitted[1];
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
     * Generate the topic for a specific channel
     *
     * @private
     * @param {String} deviceId - deviceId from which you want to stream
     * @param {String} channel - channel name from which you want to stream
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_streamChannelTopicFor',
    value: function _streamChannelTopicFor(deviceId, channel) {
      return deviceId + '/' + channel;
    }

    /**
     * Generate the topic for a specific stream
     *
     * @private
     * @param {String} streamName - stream name from which you want to stream
     * @return a string that represents the topic name for that stream
     */

  }, {
    key: '_streamTopicFor',
    value: function _streamTopicFor(stream) {
      return this.liveStreamByName(stream) + '/' + this._liveStreamSuffix;
    }
  }]);

  return MqttStreamClient;
}(_mqttClient2.default);

// Remove unwnated methods inherited from MqttClient


delete MqttStreamClient.onReceive;
delete MqttStreamClient.publish;
delete MqttStreamClient._topicFor;

exports.default = MqttStreamClient;
//# sourceMappingURL=mqttStreamClient.js.map
