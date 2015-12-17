'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _stomp_client = require('./stomp_client');

var _stomp_client2 = _interopRequireDefault(_stomp_client);

var _spacebunny_errors = require('../spacebunny_errors');

var _spacebunny_errors2 = _interopRequireDefault(_spacebunny_errors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * A module that exports an StompClient client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * which inherits from the SpaceBunny base client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * @module StompClient
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

// Import some helpers modules

// Import SpaceBunny main module from which StompClient inherits

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */

var StompStreamClient = (function (_StompClient) {
  _inherits(StompStreamClient, _StompClient);

  function StompStreamClient(opts) {
    _classCallCheck(this, StompStreamClient);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(StompStreamClient).call(this, opts));

    _this._subscriptions = {};
    _this._channelExchangePrefix = 'exchange';
    _this._defaultPattern = '#';
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
    value: function streamFrom(streamHooks, opts) {
      var _this2 = this;

      var promises = streamHooks.map(function (streamHook) {
        return _this2._attachStreamHook(streamHook, opts);
      });

      return _bluebird2.default.any(promises);
    }

    /**
     * Destroy the connection between the stomp client and broker
     *
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
            _this4._subscriptions[subscription].unsubscribe();
          }
          _this4._subscriptions = {};
          _this4._stompConnection.disconnect(function () {
            this._stompConnection = undefined;
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
     * Start consuming messages from a device's channel
     * It generates an auto delete queue from which consume
     * and binds it to the channel exchange
     *
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
      // Receive messages from imput queue
      var deviceId = streamHook.deviceId;
      var channel = streamHook.channel;
      var emptyFunction = function emptyFunction() {
        return undefined;
      };
      var callback = streamHook.callback || emptyFunction;
      if (deviceId === undefined || channel === undefined) {
        throw new _spacebunny_errors2.default.MissingStreamConfigurations('Missing Device ID or Channel');
      }
      return new _bluebird2.default(function (resolve, reject) {
        _this5._connect().then(function (client) {
          var topic = _this5._topicFor(deviceId, channel);
          var subscription = client.subscribe(topic, function (message) {
            callback(message);
          }, function (reason) {
            reject(reason);
          });
          _this5._subscriptions[topic] = subscription;
          resolve(true);
        }).catch(function (reason) {
          reject(reason);
        });
      });
    }

    /**
     * @private
     * Generate the subscription string for a specific channel
     *
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_topicFor',
    value: function _topicFor(deviceId, channel, type, pattern) {
      return '/' + (type || this._channelExchangePrefix) + '/' + deviceId + '.' + channel + '/' + (pattern || this._defaultPattern);
    }
  }]);

  return StompStreamClient;
})(_stomp_client2.default);

// Remove unwnated methods inherited from StompClient

delete StompStreamClient.onReceive;
delete StompStreamClient.publish;
delete StompStreamClient._subcriptionFor;
delete StompStreamClient._destinationFor;

exports.default = StompStreamClient;
//# sourceMappingURL=stomp_stream_client.js.map
