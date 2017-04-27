'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

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


var CONFIG = require('../../config/constants').CONFIG;

var AmqpStreamClient = function (_AmqpClient) {
  _inherits(AmqpStreamClient, _AmqpClient);

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  function AmqpStreamClient(opts) {
    _classCallCheck(this, AmqpStreamClient);

    var _this = _possibleConstructorReturn(this, (AmqpStreamClient.__proto__ || Object.getPrototypeOf(AmqpStreamClient)).call(this, opts));

    var amqpStreamOptions = CONFIG.amqp.stream;
    _this._defaultStreamRoutingKey = amqpStreamOptions.defaultStreamRoutingKey;
    _this._streamQueueArguments = amqpStreamOptions.streamQueueArguments;
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
      var _this3 = this;

      // Receive messages from imput queue
      return new _bluebird2.default(function (resolve, reject) {
        var deviceId = streamHook.deviceId;
        var channel = streamHook.channel;
        var stream = streamHook.stream;
        var cache = typeof streamHook.cache !== 'boolean' ? true : streamHook.cache;
        if (stream === undefined && (channel === undefined || deviceId === undefined)) {
          reject('Missing Stream or Device ID and Channel');
        }
        var routingKey = streamHook.routingKey || _this3._defaultStreamRoutingKey;
        var emptyFunction = function emptyFunction() {
          return undefined;
        };
        var callback = streamHook.callback || emptyFunction;

        var currentTime = new Date().getTime();
        _this3._createChannel('' + currentTime).then(function (ch) {
          _this3._amqpChannels['' + currentTime] = ch;
          var promisesChain = undefined;
          // if current hook is a stream
          // checks the existence of the stream queue and starts consuming
          if (stream) {
            if (!_this3.liveStreamExists(stream)) {
              console.error('Stream ' + stream + ' does not exist'); // eslint-disable-line no-console
              resolve(false);
            }
            if (cache) {
              // Cached streams are connected to the existing live stream queue
              var cachedStreamQueue = _this3._cachedStreamQueue(stream);
              promisesChain = _this3._amqpChannels['' + currentTime].checkQueue(cachedStreamQueue, _this3._streamQueueArguments).then(function () {
                return _this3._amqpChannels['' + currentTime].consume(cachedStreamQueue, function (message) {
                  // Call message callback
                  callback(_this3._parseContent(message.content), message.fields, message.properties);
                }, (0, _merge2.default)(_this3._subscribeArgs, opts));
              });
            } else {
              // Uncached streams are connected to the stream exchange and create a temp queue
              var streamExchange = _this3.exchangeName(stream, _this3._liveStreamSuffix);
              var streamChannelQueue = _this3.tempQueue(stream, _this3._liveStreamSuffix, currentTime);
              promisesChain = _this3._amqpChannels['' + currentTime].checkExchange(streamExchange).then(function () {
                return _this3._amqpChannels['' + currentTime].assertQueue(streamChannelQueue, _this3._streamQueueArguments);
              }).then(function () {
                return _this3._amqpChannels['' + currentTime].bindQueue(streamChannelQueue, streamExchange, routingKey);
              }).then(function () {
                return _this3._amqpChannels['' + currentTime].consume(streamChannelQueue, function (message) {
                  callback(_this3._parseContent(message.content), message.fields, message.properties);
                }, (0, _merge2.default)(_this3._subscribeArgs, opts));
              });
            }
          } else {
            // else if current hook is channel (or a couple deviceId, channel)
            // creates a temp queue, binds to channel exchange and starts consuming
            var channelExchangeName = _this3.exchangeName(deviceId, channel);
            var _streamChannelQueue = _this3.tempQueue(deviceId, channel, currentTime);
            promisesChain = _this3._amqpChannels['' + currentTime].checkExchange(channelExchangeName).then(function () {
              return _this3._amqpChannels['' + currentTime].assertQueue(_streamChannelQueue, _this3._streamQueueArguments);
            }).then(function () {
              return _this3._amqpChannels['' + currentTime].bindQueue(_streamChannelQueue, channelExchangeName, routingKey);
            }).then(function () {
              return _this3._amqpChannels['' + currentTime].consume(_streamChannelQueue, function (message) {
                callback(_this3._parseContent(message.content), message.fields, message.properties);
              }, (0, _merge2.default)(_this3._subscribeArgs, opts));
            });
          }
          return promisesChain;
        }).then(function () {
          resolve(true);
        }).catch(function (reason) {
          reject(reason);
        });
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
      return this.liveStreamByName(streamName) + '.' + this._liveStreamSuffix;
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
