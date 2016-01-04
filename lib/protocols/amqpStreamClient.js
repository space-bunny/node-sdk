'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _amqpClient = require('./amqpClient');

var _amqpClient2 = _interopRequireDefault(_amqpClient);

var _spacebunnyErrors = require('../spacebunnyErrors');

var _spacebunnyErrors2 = _interopRequireDefault(_spacebunnyErrors);

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

var AmqpStreamClient = (function (_AmqpClient) {
  _inherits(AmqpStreamClient, _AmqpClient);

  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */

  function AmqpStreamClient(opts) {
    _classCallCheck(this, AmqpStreamClient);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AmqpStreamClient).call(this, opts));

    _this._defaultStreamRoutingKey = '#';
    _this._streamQueueArguments = { exclusive: true, autoDelete: true, durable: false };
    _this._streamQueueSuffix = 'stream';
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
    value: function streamFrom(streamHooks, opts) {
      var _this2 = this;

      var promises = streamHooks.map(function (streamHook) {
        return _this2._attachStreamHook(streamHook, opts);
      });

      return _bluebird2.default.any(promises);
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
      var deviceId = streamHook.deviceId;
      var channel = streamHook.channel;
      var routingKey = streamHook.routingKey || this._defaultStreamRoutingKey;
      var emptyFunction = function emptyFunction() {
        return undefined;
      };
      var callback = streamHook.callback || emptyFunction;
      if (deviceId === undefined || channel === undefined) {
        throw new _spacebunnyErrors2.default.MissingStreamConfigurations('Missing Device ID or Channel');
      }
      return new _bluebird2.default(function (resolve, reject) {
        var currentTime = new Date().getTime();
        _this3._createChannel('' + currentTime).then(function (ch) {
          _this3._amqpChannels['' + currentTime] = ch;
          return _this3._amqpChannels['' + currentTime].checkExchange(_this3._channelExchange(deviceId, channel));
        }).then(function () {
          return _this3._amqpChannels['' + currentTime].assertQueue(_this3._streamQueue(deviceId, channel, currentTime), _this3._streamQueueArguments);
        }).then(function () {
          return _this3._amqpChannels['' + currentTime].bindQueue(_this3._streamQueue(deviceId, channel, currentTime), _this3._channelExchange(deviceId, channel), routingKey);
        }).then(function () {
          return _this3._amqpChannels['' + currentTime].consume(_this3._streamQueue(deviceId, channel, currentTime), function (message) {
            callback(_this3._parseContent(message));
          }, (0, _merge2.default)(_this3._subscribeArgs, opts));
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
     * @param {String} deviceId - Device id from which you want to stream
     * @param {String} channel - channel name from which you want to stream
     * @param {String} currentTime - current UNIX timestamp
     * @return a string that represents the stream queue name prefixed with current timestamp, client ID and channel exchange
     */

  }, {
    key: '_streamQueue',
    value: function _streamQueue(deviceId, channel, currentTime) {
      var prefix = currentTime || new Date().getTime();
      return prefix + '-' + this._connectionParams.client + '-' + this._channelExchange(deviceId, channel) + '.' + this._streamQueueSuffix;
    }
  }]);

  return AmqpStreamClient;
})(_amqpClient2.default);

// Remove unwanted methods inherited from AmqpClient

delete AmqpStreamClient.onReceive;
delete AmqpStreamClient.publish;
delete AmqpStreamClient._routingKeyFor;

exports.default = AmqpStreamClient;
//# sourceMappingURL=amqpStreamClient.js.map
