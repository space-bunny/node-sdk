'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _merge2 = require('lodash/merge');

var _merge3 = _interopRequireDefault(_merge2);

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _jsMd = require('js-md5');

var _jsMd2 = _interopRequireDefault(_jsMd);

var _stompClient = require('./stompClient');

var _stompClient2 = _interopRequireDefault(_stompClient);

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * A module that exports an StompStreamClient client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * which inherits from the Stomp base client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * @module StompStreamClient
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

// Import some helpers modules


// Import StompClient main module from which StompStreamClient inherits


var _require = require('../../config/constants'),
    CONFIG = _require.CONFIG;

var StompStreamClient = function (_StompClient) {
  _inherits(StompStreamClient, _StompClient);

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  function StompStreamClient() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, StompStreamClient);

    var _this = _possibleConstructorReturn(this, (StompStreamClient.__proto__ || Object.getPrototypeOf(StompStreamClient)).call(this, opts));

    _this._subscriptions = {};
    var stompStreamOpts = CONFIG.stomp.stream;
    _this._defaultResource = CONFIG.stomp.defaultResource;
    _this._defaultPattern = stompStreamOpts.defaultPattern;
    return _this;
  }

  /**
   * Subscribe to multiple stream hooks
   *
   * @param {Array} streamHooks - Array of objects. Each objects containing
   * { deviceId: {string}, channel: {string}, callback: {func} }
   * @param {Object} options - subscription options
   * @return promise containing the result of multiple subscriptions
   */


  _createClass(StompStreamClient, [{
    key: 'streamFrom',
    value: function streamFrom() {
      var _this2 = this;

      var streamHooks = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (streamHooks.length > 0) {
        return _bluebird2.default.mapSeries(streamHooks, function (streamHook) {
          return _this2._attachStreamHook(streamHook, opts);
        });
      } else {
        return _bluebird2.default.reject(new Error('Missing stream hooks'));
      }
    }

    /**
     * Unsubscribe client from a topic
     *
     * @param {String} subscriptionId - subscription ID
     * @return a promise containing the result of the operation
     */

  }, {
    key: 'unsubscribe',
    value: function unsubscribe() {
      var _this3 = this;

      var subscriptionId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;

      return new _bluebird2.default(function (resolve, reject) {
        if (!_this3.isConnected()) {
          reject(new Error('Invalid connection'));
        } else {
          var subscription = _this3._subscriptions[subscriptionId];
          if (subscription) {
            subscription.unsubscribe();
            delete _this3._subscriptions[subscriptionId];
            resolve(true);
          } else {
            reject(new Error('Subscription not found'));
          }
        }
      });
    }

    /**
     * Destroy the connection between the stomp client and broker
     *
     * @return a promise containing the result of the operation
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      var _this4 = this;

      return new _bluebird2.default(function (resolve, reject) {
        if (!_this4.isConnected()) {
          reject(new Error('Invalid connection'));
        } else {
          var subscriptions = Object.keys(_this4._subscriptions);
          subscriptions.forEach(function (subscription) {
            if (_this4._subscriptions[subscription]) {
              _this4._subscriptions[subscription].unsubscribe();
            }
          });
          _this4._subscriptions = {};
          _this4._stompConnection.disconnect(function () {
            _this4._stompConnection = undefined;
            resolve(true);
          }).catch(function (reason) {
            reject(reason);
          });
        }
      });
    }

    // ------------ PRIVATE METHODS -------------------

    /**
     * Start consuming messages from a device's channel
     * It generates an auto delete queue from which consume
     * and binds it to the channel exchange
     *
     * @private
     * @param {Object} streamHook - Object containit hook info
     * { deviceId: {String}, channel: {String}, callback: {func}}
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */

  }, {
    key: '_attachStreamHook',
    value: function _attachStreamHook(streamHook) {
      var _this5 = this;

      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return new _bluebird2.default(function (resolve, reject) {
        // let localOpts = _.cloneDeep(opts);
        // localOpts = _.merge({}, localOpts);
        // Receive messages from imput queue
        var _streamHook$stream = streamHook.stream,
            stream = _streamHook$stream === undefined ? undefined : _streamHook$stream,
            _streamHook$deviceId = streamHook.deviceId,
            deviceId = _streamHook$deviceId === undefined ? undefined : _streamHook$deviceId,
            _streamHook$channel = streamHook.channel,
            channel = _streamHook$channel === undefined ? undefined : _streamHook$channel,
            _streamHook$routingKe = streamHook.routingKey,
            routingKey = _streamHook$routingKe === undefined ? undefined : _streamHook$routingKe,
            _streamHook$topic = streamHook.topic,
            topic = _streamHook$topic === undefined ? undefined : _streamHook$topic;

        var cache = typeof streamHook.cache !== 'boolean' ? true : streamHook.cache;
        var emptyFunction = function emptyFunction() {
          return undefined;
        };
        var callback = streamHook.callback || emptyFunction;
        if (stream === undefined && deviceId === undefined) {
          reject(new Error('Missing Stream or Device ID'));
        }
        _this5.connect().then(function (client) {
          var streamTopic = void 0;
          var tempQueue = void 0;
          if (stream) {
            if (!_this5.liveStreamExists(stream)) {
              console.error('Stream ' + stream + ' does not exist'); // eslint-disable-line no-console
              resolve(false);
            }
            if (cache) {
              // Cached streams are connected to the existing live stream queue
              streamTopic = _this5._cachedStreamTopicFor({ stream: stream });
            } else {
              // Uncached streams are connected to the stream exchange and create a temp queue
              streamTopic = _this5._streamTopicFor({ stream: stream, routingKey: routingKey, topic: topic });
              tempQueue = _this5.tempQueue(stream, _this5._liveStreamSuffix);
            }
          } else {
            // else if current hook is channel (or a couple deviceId, channel)
            // creates a temp queue, binds to channel exchange and starts consuming
            streamTopic = _this5._streamChannelTopicFor({
              deviceId: deviceId, channel: channel, routingKey: routingKey, topic: topic
            });
            tempQueue = _this5.tempQueue(deviceId, channel);
          }
          var subscriptionHeaders = {};
          if (tempQueue) {
            subscriptionHeaders['x-queue-name'] = tempQueue;
          }
          var messageCallback = function messageCallback(message) {
            callback((0, _utils.parseContent)(message.body), message.headers);
          };
          try {
            var subscriptionId = (0, _jsMd2.default)(tempQueue + '-' + streamTopic);
            var subscription = client.subscribe(streamTopic, messageCallback, _extends({}, subscriptionHeaders, {
              id: subscriptionId
            }));
            _this5._subscriptions[subscriptionId] = subscription;
            resolve((0, _merge3.default)(streamHook, { id: subscriptionId }));
          } catch (e) {
            console.error(e); // eslint-disable-line no-console
            resolve(undefined);
          }
        }).catch(function (reason) {
          console.error(reason); // eslint-disable-line no-console
          resolve(undefined);
        });
      });
    }

    /**
     * Generate the subscription string for a specific channel
     *
     * @private
     * @param {String} deviceId - deviceId from which you want to stream from
     * @param {String} channel - channel name from which you want to stream from
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} routingKey - binding pattern
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_streamChannelTopicFor',
    value: function _streamChannelTopicFor() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _params$deviceId = params.deviceId,
          deviceId = _params$deviceId === undefined ? undefined : _params$deviceId,
          _params$channel = params.channel,
          channel = _params$channel === undefined ? undefined : _params$channel,
          _params$type = params.type,
          type = _params$type === undefined ? this._defaultResource : _params$type,
          _params$routingKey = params.routingKey,
          routingKey = _params$routingKey === undefined ? this._defaultPattern : _params$routingKey,
          _params$topic = params.topic,
          topic = _params$topic === undefined ? undefined : _params$topic;

      var resource = deviceId;
      if (channel) {
        resource += '.' + channel;
      }
      var finalTopic = resource;
      if (topic) {
        finalTopic += '.' + topic;
      } else {
        finalTopic = routingKey;
      }
      return '/' + type + '/' + resource + '/' + finalTopic;
    }

    /**
     * Generate the subscription string for cached live streams
     *
     * @private
     * @param {String} stream - stream name from which you want to stream
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_cachedStreamTopicFor',
    value: function _cachedStreamTopicFor() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _params$stream = params.stream,
          stream = _params$stream === undefined ? undefined : _params$stream,
          _params$type2 = params.type,
          type = _params$type2 === undefined ? this._existingQueuePrefix : _params$type2;

      var topic = stream;
      return '/' + type + '/' + topic + '.' + this._liveStreamSuffix;
    }

    /**
     * Generate the subscription for live streams without caching
     *
     * @private
     * @param {String} stream - stream name from which you want to stream
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} routingKey - binding pattern
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_streamTopicFor',
    value: function _streamTopicFor() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _params$stream2 = params.stream,
          stream = _params$stream2 === undefined ? undefined : _params$stream2,
          _params$type3 = params.type,
          type = _params$type3 === undefined ? this._defaultResource : _params$type3,
          _params$routingKey2 = params.routingKey,
          routingKey = _params$routingKey2 === undefined ? this._defaultPattern : _params$routingKey2;

      var resource = stream;
      return '/' + type + '/' + resource + '.' + this._liveStreamSuffix + '/' + routingKey;
    }
  }]);

  return StompStreamClient;
}(_stompClient2.default);

// Remove unwnated methods inherited from StompClient


delete StompStreamClient.onReceive;
delete StompStreamClient.publish;
delete StompStreamClient._subcriptionFor;
delete StompStreamClient._destinationFor;

exports.default = StompStreamClient;
//# sourceMappingURL=stompStreamClient.js.map
