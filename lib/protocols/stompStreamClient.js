'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _stompClient = require('./stompClient');

var _stompClient2 = _interopRequireDefault(_stompClient);

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


var CONFIG = require('../../config/constants').CONFIG;

var StompStreamClient = function (_StompClient) {
  _inherits(StompStreamClient, _StompClient);

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  function StompStreamClient(opts) {
    _classCallCheck(this, StompStreamClient);

    var _this = _possibleConstructorReturn(this, (StompStreamClient.__proto__ || Object.getPrototypeOf(StompStreamClient)).call(this, opts));

    _this._subscriptions = {};
    var stompStreamOpts = CONFIG.stomp.stream;
    _this._exchangePrefix = stompStreamOpts.exchangePrefix;
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
      var opts = arguments[1];

      var promises = streamHooks.map(function (streamHook) {
        return _this2._attachStreamHook(streamHook, opts);
      }) || [];
      if (promises.length > 0) {
        return _bluebird2.default.any(promises);
      } else {
        return _bluebird2.default.reject('Missing stream hooks');
      }
    }

    /**
     * Unsubscribe client from a topic
     *
     * @param {String} deviceId - Device uuid
     * @param {String} channel - channel name
     * @return a promise containing the result of the operation
     */

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(deviceId, channel) {
      var _this3 = this;

      return new _bluebird2.default(function (resolve, reject) {
        if (_this3._stompConnection === undefined) {
          reject('Invalid connection');
        } else {
          var topic = _this3._topicFor(deviceId, channel);
          var subscription = _this3._subscriptions[topic];
          subscription.unsubscribe(topic);
          delete _this3._subscriptions[topic];
          resolve(true);
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
        if (_this4._stompConnection === undefined) {
          reject('Invalid connection');
        } else {
          for (var subscription in _this4._subscriptions) {
            if (subscription) {
              _this4._subscriptions[subscription].unsubscribe();
            }
          }
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
    value: function _attachStreamHook(streamHook, opts) {
      var _this5 = this;

      opts = (0, _merge2.default)({}, opts);
      return new _bluebird2.default(function (resolve, reject) {
        // Receive messages from imput queue
        var stream = streamHook.stream;
        var deviceId = streamHook.deviceId;
        var channel = streamHook.channel;
        var cache = typeof streamHook.cache !== 'boolean' ? true : streamHook.cache;
        var emptyFunction = function emptyFunction() {
          return undefined;
        };
        var callback = streamHook.callback || emptyFunction;
        if (stream === undefined && (channel === undefined || deviceId === undefined)) {
          reject('Missing Stream or Device ID and Channel');
        }
        _this5.connect().then(function (client) {
          var topic = undefined;
          var tempQueue = undefined;
          if (stream) {
            if (!_this5.liveStreamExists(stream)) {
              console.error('Stream ' + stream + ' does not exist'); // eslint-disable-line no-console
              resolve(false);
            }
            if (cache) {
              // Cached streams are connected to the existing live stream queue
              topic = _this5._cachedStreamTopicFor(stream);
            } else {
              // Uncached streams are connected to the stream exchange and create a temp queue
              topic = _this5._streamTopicFor(stream);
              tempQueue = _this5.tempQueue(stream, _this5._liveStreamSuffix);
            }
          } else {
            // else if current hook is channel (or a couple deviceId, channel)
            // creates a temp queue, binds to channel exchange and starts consuming
            topic = _this5._streamChannelTopicFor(deviceId, channel);
            tempQueue = _this5.tempQueue(deviceId, channel);
          }
          var subscriptionHeaders = {};
          if (tempQueue) {
            subscriptionHeaders['x-queue-name'] = tempQueue;
          }
          var messageCallback = function messageCallback(message) {
            callback(_this5._parseContent(message.body), message.headers);
          };
          var subscription = client.subscribe(topic, messageCallback, subscriptionHeaders);
          _this5._subscriptions[topic] = subscription;
          resolve(true);
        }).catch(function (reason) {
          reject(reason);
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
     * @param {String} pattern - binding pattern
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_streamChannelTopicFor',
    value: function _streamChannelTopicFor(deviceId, channel, type, pattern) {
      return '/' + (type || this._exchangePrefix) + '/' + deviceId + '.' + channel + '/' + (pattern || this._defaultPattern);
    }

    /**
     * Generate the subscription string for cached live streams
     *
     * @private
     * @param {String} streamName - stream name from which you want to stream
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_cachedStreamTopicFor',
    value: function _cachedStreamTopicFor(streamName, type) {
      return '/' + (type || this._existingQueuePrefix) + '/' + this.liveStreamByName(streamName) + '.' + ('' + this._liveStreamSuffix);
    }

    /**
     * Generate the subscription for live streams without caching
     *
     * @private
     * @param {String} streamName - stream name from which you want to stream
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} pattern - binding pattern
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_streamTopicFor',
    value: function _streamTopicFor(streamName, type, pattern) {
      return '/' + (type || this._exchangePrefix) + '/' + this.liveStreamByName(streamName) + '.' + (this._liveStreamSuffix + '/' + (pattern || this._defaultPattern));
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
