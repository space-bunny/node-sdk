'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _isEmpty2 = require('lodash/isEmpty');

var _isEmpty3 = _interopRequireDefault(_isEmpty2);

var _merge2 = require('lodash/merge');

var _merge3 = _interopRequireDefault(_merge2);

var _cloneDeep2 = require('lodash/cloneDeep');

var _cloneDeep3 = _interopRequireDefault(_cloneDeep2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _jsMd = require('js-md5');

var _jsMd2 = _interopRequireDefault(_jsMd);

var _amqpClient = require('./amqpClient');

var _amqpClient2 = _interopRequireDefault(_amqpClient);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * A module that exports an AmqpStreamClient client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * which inherits from the Amqp base client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * @module AmqpStreamClient
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

// Import some helpers modules


// Import AmqpClient module from which AmqpStreamClient inherits


var _require = require('../../config/constants'),
    CONFIG = _require.CONFIG;

var AmqpStreamClient = function (_AmqpClient) {
  _inherits(AmqpStreamClient, _AmqpClient);

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  function AmqpStreamClient() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, AmqpStreamClient);

    var _this = _possibleConstructorReturn(this, (AmqpStreamClient.__proto__ || Object.getPrototypeOf(AmqpStreamClient)).call(this, opts));

    var amqpStreamOptions = CONFIG.amqp.stream;
    _this._defaultStreamRoutingKey = amqpStreamOptions.defaultStreamRoutingKey;
    _this._streamQueueArguments = amqpStreamOptions.streamQueueArguments;
    _this._subscriptions = [];
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


  _createClass(AmqpStreamClient, [{
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

    // ------------ PRIVATE METHODS -------------------

    /**
     * Start consuming messages from a device's channel
     * It generates an auto delete queue from which consume
     * and binds it to the channel exchange
     *
     * @private
     * @param {Object} streamHook - Object containit hook info
     * { stream: {String}, callback: {func}}
     * or
     * { deviceId: {String}, channel: {String}, callback: {func}}
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */

  }, {
    key: '_attachStreamHook',
    value: function _attachStreamHook(streamHook) {
      var _this3 = this;

      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      // Receive messages from imput queue
      return new _bluebird2.default(function (resolve, reject) {
        var _streamHook$stream = streamHook.stream,
            stream = _streamHook$stream === undefined ? undefined : _streamHook$stream,
            _streamHook$deviceId = streamHook.deviceId,
            deviceId = _streamHook$deviceId === undefined ? undefined : _streamHook$deviceId,
            _streamHook$channel = streamHook.channel,
            channel = _streamHook$channel === undefined ? undefined : _streamHook$channel,
            _streamHook$topic = streamHook.topic,
            topic = _streamHook$topic === undefined ? undefined : _streamHook$topic,
            _streamHook$routingKe = streamHook.routingKey,
            routingKey = _streamHook$routingKe === undefined ? undefined : _streamHook$routingKe;

        var cache = typeof streamHook.cache !== 'boolean' ? true : streamHook.cache;
        if (stream === undefined && (channel === undefined || deviceId === undefined)) {
          reject(new Error('Missing Stream or Device ID and Channel'));
        }
        var emptyFunction = function emptyFunction() {
          return undefined;
        };
        var callback = streamHook.callback || emptyFunction;

        var currentTime = new Date().getTime();
        var tempQueue = void 0;
        _this3._createChannel('' + currentTime).then(function (ch) {
          _this3._amqpChannels['' + currentTime] = ch;
          var promisesChain = void 0;
          // if current hook is a stream
          // checks the existence of the stream queue and starts consuming
          var localOpts = (0, _cloneDeep3.default)(opts);
          localOpts = (0, _merge3.default)(_this3._subscribeArgs, localOpts);
          if (stream) {
            if (!_this3.liveStreamExists(stream)) {
              console.error('Stream ' + stream + ' does not exist'); // eslint-disable-line no-console
              resolve(false);
            }
            if (cache) {
              // Cached streams are connected to the existing live stream queue
              tempQueue = _this3._cachedStreamQueue(stream);
              promisesChain = _this3._amqpChannels['' + currentTime].checkQueue(tempQueue, _this3._streamQueueArguments).then(function () {
                return _this3._amqpChannels['' + currentTime].consume(tempQueue, function (message) {
                  // Call message callback
                  callback(_this3._parseContent(message.content), message.fields, message.properties);
                }, localOpts);
              });
            } else {
              // Uncached streams are connected to the stream exchange and create a temp queue
              var streamExchange = _this3.exchangeName(stream, _this3._liveStreamSuffix);
              tempQueue = _this3.tempQueue(stream, _this3._liveStreamSuffix, currentTime);
              promisesChain = _this3._amqpChannels['' + currentTime].checkExchange(streamExchange).then(function () {
                return _this3._amqpChannels['' + currentTime].assertQueue(tempQueue, _this3._streamQueueArguments);
              }).then(function () {
                return _this3._amqpChannels['' + currentTime].bindQueue(tempQueue, streamExchange, routingKey);
              }).then(function () {
                return _this3._amqpChannels['' + currentTime].consume(tempQueue, function (message) {
                  callback(_this3._parseContent(message.content), message.fields, message.properties);
                }, localOpts);
              });
            }
          } else {
            // else if current hook is channel (or a couple deviceId, channel)
            // creates a temp queue, binds to channel exchange and starts consuming
            var channelExchangeName = _this3.exchangeName(deviceId, channel);
            tempQueue = _this3.tempQueue(deviceId, channel, currentTime);
            promisesChain = _this3._amqpChannels['' + currentTime].checkExchange(channelExchangeName).then(function () {
              return _this3._amqpChannels['' + currentTime].assertQueue(tempQueue, _this3._streamQueueArguments);
            }).then(function () {
              return _this3._amqpChannels['' + currentTime].bindQueue(tempQueue, channelExchangeName, _this3._streamRoutingKeyFor({
                deviceId: deviceId, channel: channel, routingKey: routingKey, topic: topic
              }));
            }).then(function () {
              return _this3._amqpChannels['' + currentTime].consume(tempQueue, function (message) {
                callback(_this3._parseContent(message.content), message.fields, message.properties);
              }, localOpts);
            });
          }
          return promisesChain;
        }).then(function () {
          var subscriptionId = (0, _jsMd2.default)(tempQueue);
          _this3._subscriptions[subscriptionId] = { amqpChannel: currentTime };
          resolve((0, _merge3.default)(streamHook, { id: subscriptionId }));
        }).catch(function (reason) {
          reject(reason);
        });
      });
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
      var _this4 = this;

      var subscriptionId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;

      return new _bluebird2.default(function (resolve, reject) {
        if (!_this4.isConnected()) {
          reject(new Error('Invalid connection'));
        } else {
          var subscription = _this4._subscriptions[subscriptionId];
          if (subscription) {
            var amqpChannel = subscription.amqpChannel;

            if (_this4._amqpChannels[amqpChannel]) {
              _this4._amqpChannels[amqpChannel].close();
              delete _this4._amqpChannels[amqpChannel];
              delete _this4._subscriptions[subscriptionId];
            }
            resolve(true);
          } else {
            reject(new Error('Subscription not found'));
          }
        }
      });
    }

    /**
     * Generate the exchange name for a device's channel
     *
     * @private
     * @param {String} streamName - stream name from which you want to stream
     * @return a string that represents the stream queue
     */

  }, {
    key: '_cachedStreamQueue',
    value: function _cachedStreamQueue(streamName) {
      return streamName + '.' + this._liveStreamSuffix;
    }

    /**
     * Generate the exchange name for a device's channel
     *
     * @private
     * @param {Object} params - params
     * @return a string that represents the rounting key
     */

  }, {
    key: '_streamRoutingKeyFor',
    value: function _streamRoutingKeyFor() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _params$deviceId = params.deviceId,
          deviceId = _params$deviceId === undefined ? undefined : _params$deviceId,
          _params$channel = params.channel,
          channel = _params$channel === undefined ? undefined : _params$channel,
          _params$routingKey = params.routingKey,
          routingKey = _params$routingKey === undefined ? undefined : _params$routingKey,
          _params$topic = params.topic,
          topic = _params$topic === undefined ? undefined : _params$topic;

      if ((0, _isEmpty3.default)(routingKey) && (0, _isEmpty3.default)(deviceId)) {
        // if both routingKey and deviceId are empty return default routingKey
        return this._defaultStreamRoutingKey;
      } else if (routingKey) {
        // return routing key if present
        return routingKey;
      } else {
        var streamRoutingKey = deviceId;
        if (channel) {
          streamRoutingKey += '.' + channel;
        }
        if (topic) {
          streamRoutingKey += '.' + topic;
        }
        return '' + streamRoutingKey;
      }
    }
  }]);

  return AmqpStreamClient;
}(_amqpClient2.default);

// Remove unwanted methods inherited from AmqpClient


delete AmqpStreamClient.onReceive;
delete AmqpStreamClient.publish;
delete AmqpStreamClient._routingKeyFor;

exports.default = AmqpStreamClient;
//# sourceMappingURL=amqpStreamClient.js.map
