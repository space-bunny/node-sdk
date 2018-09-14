'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _merge2 = require('lodash/merge');

var _merge3 = _interopRequireDefault(_merge2);

var _cloneDeep2 = require('lodash/cloneDeep');

var _cloneDeep3 = _interopRequireDefault(_cloneDeep2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _mqttClient = require('./mqttClient');

var _mqttClient2 = _interopRequireDefault(_mqttClient);

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

  function MqttStreamClient() {
    _classCallCheck(this, MqttStreamClient);

    return _possibleConstructorReturn(this, (MqttStreamClient.__proto__ || Object.getPrototypeOf(MqttStreamClient)).apply(this, arguments));
  }

  _createClass(MqttStreamClient, [{
    key: 'streamFrom',

    /**
     * Subscribe to multiple stream hooks
     *
     * @param {Array} streamHooks - Array of objects. Each objects containing
     * { deviceId: {string}, channel: {string}, callback: {func} }
     * @param {Object} options - subscription options
     * @return promise containing the result of multiple subscriptions
     */
    value: function streamFrom() {
      var _this2 = this;

      var streamHooks = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return new _bluebird2.default(function (resolve, reject) {
        _this2.connect().then(function (mqttClient) {
          var emptyFunction = function emptyFunction() {
            return undefined;
          };
          streamHooks.forEach(function (streamHook) {
            var stream = streamHook.stream;
            var deviceId = streamHook.deviceId;
            var channel = streamHook.channel;
            var qos = streamHook.qos;
            var cache = typeof streamHook.cache !== 'boolean' ? true : streamHook.cache;
            if (stream === undefined && (channel === undefined || deviceId === undefined)) {
              reject(new Error('Missing Stream or Device ID and Channel'));
            }
            if (stream) {
              if (!_this2.liveStreamExists(stream)) {
                console.error('Stream ' + stream + ' does not exist'); // eslint-disable-line no-console
                resolve(false);
              }
              // Cached streams generate qos1 connections with persistent queues
              // Uncached streams generate qos0 connections with auto delete queues
              _this2._topics[_this2._streamTopicFor(stream)] = cache ? 1 : 0;
            } else {
              // streams connected directly to a specific channel generate qos0 connections with auto delete queues
              _this2._topics[_this2._streamChannelTopicFor(deviceId, channel)] = qos || _this2._connectionOpts.qos;
            }
          });
          var localOpts = (0, _cloneDeep3.default)(opts);
          localOpts = (0, _merge3.default)((0, _cloneDeep3.default)(_this2._connectionOpts), localOpts);
          mqttClient.subscribe(_this2._topics, localOpts, function (err) {
            if (err) {
              reject(err);
            } else {
              mqttClient.on('message', function (topic, message) {
                var splitted = topic.split('/');
                var streams = streamHooks.filter(function (streamHook) {
                  return streamHook.stream === splitted[0] || streamHook.deviceId === splitted[0] && streamHook.channel === splitted[1];
                });
                var callback = emptyFunction;
                if (streams.length > 0) {
                  callback = streams[0].callback || emptyFunction;
                }
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
      return stream + '/' + this._liveStreamSuffix;
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
