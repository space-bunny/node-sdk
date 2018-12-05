'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _includes2 = require('lodash/includes');

var _includes3 = _interopRequireDefault(_includes2);

var _isEmpty2 = require('lodash/isEmpty');

var _isEmpty3 = _interopRequireDefault(_isEmpty2);

var _merge2 = require('lodash/merge');

var _merge3 = _interopRequireDefault(_merge2);

var _cloneDeep2 = require('lodash/cloneDeep');

var _cloneDeep3 = _interopRequireDefault(_cloneDeep2);

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _stompjs = require('stompjs');

var _stompjs2 = _interopRequireDefault(_stompjs);

var _spacebunny = require('../spacebunny');

var _spacebunny2 = _interopRequireDefault(_spacebunny);

var _stompMessage = require('../messages/stompMessage');

var _stompMessage2 = _interopRequireDefault(_stompMessage);

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * A module that exports an StompClient client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * which inherits from the SpaceBunny base client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * @module StompClient
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

// Import some helpers modules


// Import stomp library


// Import SpaceBunny main module from which StompClient inherits


var _require = require('../../config/constants'),
    CONFIG = _require.CONFIG;

var StompClient = function (_SpaceBunny) {
  _inherits(StompClient, _SpaceBunny);

  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  function StompClient() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, StompClient);

    var _this = _possibleConstructorReturn(this, (StompClient.__proto__ || Object.getPrototypeOf(StompClient)).call(this, opts));

    _this._stompConnection = undefined;
    _this._subscription = undefined;
    if ((typeof process === 'undefined' ? 'undefined' : _typeof(process)) === 'object' && '' + process === '[object process]') {
      _this._protocol = 'stomp';
    } else {
      _this._protocol = 'webStomp';
    }
    var stompOpts = CONFIG.stomp;
    var webStompOpts = CONFIG.webStomp;
    _this._webSocketOpts = webStompOpts.webSocket;
    _this._connectionHeaders = stompOpts.connection.headers;
    _this._connectionOpts = stompOpts.connection.opts;
    _this._existingQueuePrefix = stompOpts.existingQueuePrefix;
    _this._defaultResource = stompOpts.defaultResource;
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


  _createClass(StompClient, [{
    key: 'onReceive',
    value: function onReceive(callback) {
      var _this2 = this;

      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      // subscribe for input messages
      return new _bluebird2.default(function (resolve, reject) {
        var localOpts = (0, _cloneDeep3.default)(opts);
        localOpts = (0, _merge3.default)({}, localOpts);
        _this2.connect().then(function (client) {
          var topic = _this2._subcriptionFor(_this2._existingQueuePrefix, _this2._inboxTopic);
          var subscriptionCallback = function subscriptionCallback(message) {
            // Create message object
            var stompMessage = new _stompMessage2.default({ message: message, receiverId: _this2._deviceId, subscriptionOpts: localOpts });
            var ackNeeded = _this2._autoAck(localOpts.ack);
            // Check if should be accepted or not
            if (stompMessage.blackListed()) {
              if (ackNeeded) {
                message.nack();
              }
              return;
            }
            // Call message callback
            callback(stompMessage);
            // Check if ACK is needed
            if (ackNeeded) {
              message.ack();
            }
          };
          _this2._subscription = client.subscribe(topic, subscriptionCallback);
          resolve(true);
        }).catch(function (reason) {
          reject(reason);
        });
      });
    }

    /**
     * Publish a message on a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @param {Object} message - the message payload
     * @param {Object} opts - publication options
     * @return a promise containing the result of the operation
     */

  }, {
    key: 'publish',
    value: function publish(channel, message) {
      var _this3 = this;

      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      // Publish message
      return new _bluebird2.default(function (resolve, reject) {
        var localOpts = (0, _cloneDeep3.default)(opts);
        localOpts = (0, _merge3.default)({}, localOpts);
        _this3.connect().then(function (client) {
          var _localOpts = localOpts,
              _localOpts$routingKey = _localOpts.routingKey,
              routingKey = _localOpts$routingKey === undefined ? undefined : _localOpts$routingKey,
              _localOpts$topic = _localOpts.topic,
              topic = _localOpts$topic === undefined ? undefined : _localOpts$topic;

          var destination = _this3._destinationFor({ channel: channel, routingKey: routingKey, topic: topic });
          client.send(destination, _this3._connectionHeaders, (0, _utils.encapsulateContent)(message));
          resolve(true);
        }).catch(function (reason) {
          reject(reason);
        });
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
          if (_this4._subscription !== undefined) {
            _this4._subscription.unsubscribe();
          }
          _this4._stompConnection.disconnect(function () {
            _this4.emit('disconnect');
            _this4._stompConnection = undefined;
            resolve(true);
          }).catch(function (reason) {
            _this4._stompConnection = undefined;
            reject(reason);
          });
        }
      });
    }

    /**
     * Establish an stomp connection with the broker.
     * If a connection already exists, returns the current connection
     *
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */

  }, {
    key: 'connect',
    value: function connect() {
      var _this5 = this;

      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      return new _bluebird2.default(function (resolve, reject) {
        // let localOpts = _.cloneDeep(opts);
        // localOpts = _.merge(_.cloneDeep(this._connectionOpts), localOpts);
        _this5.getEndpointConfigs().then(function (endpointConfigs) {
          var connectionParams = endpointConfigs.connection;
          if (_this5.isConnected()) {
            resolve(_this5._stompConnection);
          } else {
            try {
              var client = void 0;
              if ((typeof process === 'undefined' ? 'undefined' : _typeof(process)) === 'object' && '' + process === '[object process]') {
                // code is runnning in nodejs: STOMP uses TCP sockets
                if (_this5._tls) {
                  client = _stompjs2.default.overTCP(connectionParams.host, connectionParams.protocols.stomp.tlsPort, _this5._tlsOpts);
                } else {
                  client = _stompjs2.default.overTCP(connectionParams.host, connectionParams.protocols.stomp.port);
                }
              } else {
                // code is runnning in a browser: web STOMP uses Web sockets
                var protocol = _this5._tls ? _this5._webSocketOpts.tls.protocol : _this5._webSocketOpts.protocol;
                var port = _this5._tls ? connectionParams.protocols.webStomp.tlsPort : connectionParams.protocols.webStomp.port;
                var connectionString = protocol + '://' + connectionParams.host + ':' + port + '/' + _this5._webSocketOpts.endpoint;
                var ws = new WebSocket(connectionString);
                client = _stompjs2.default.over(ws);
                client.heartbeat.outgoing = 10000;
                client.heartbeat.incoming = 10000;
                client.debug = null;
              }
              var headers = (0, _merge3.default)((0, _cloneDeep3.default)(_this5._connectionHeaders), {
                login: connectionParams.deviceId || connectionParams.client,
                passcode: connectionParams.secret,
                host: connectionParams.vhost
              });
              client.connect(headers, function () {
                _this5._stompConnection = client;
                _this5.emit('connect');
                resolve(_this5._stompConnection);
              }, function (err) {
                _this5.emit('error', err.body);
                // this._stompConnection = undefined;
                // reject(err.body);
              });
              client.debug = function (str) {
                _this5.emit('debug', str);
              };
              _this5.on('error', function () {});
            } catch (reason) {
              reject(reason);
            }
          }
        }).catch(function (reason) {
          reject(reason);
        });
      });
    }
  }, {
    key: 'isConnected',
    value: function isConnected() {
      return this._stompConnection !== undefined && this._stompConnection.connected;
    }

    // ------------ PRIVATE METHODS -------------------

    /**
     * Generate the subscription string for a specific channel
     *
     * @private
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_subcriptionFor',
    value: function _subcriptionFor(type, channel) {
      return '/' + type + '/' + this.deviceId() + '.' + channel;
    }

    /**
     * Generate the destination string for a specific channel
     *
     * @private
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */

  }, {
    key: '_destinationFor',
    value: function _destinationFor() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _params$type = params.type,
          type = _params$type === undefined ? this._defaultResource : _params$type,
          _params$channel = params.channel,
          channel = _params$channel === undefined ? undefined : _params$channel,
          _params$topic = params.topic,
          topic = _params$topic === undefined ? undefined : _params$topic,
          _params$routingKey = params.routingKey,
          routingKey = _params$routingKey === undefined ? undefined : _params$routingKey;

      var messageRoutingKey = void 0;
      if (routingKey) {
        messageRoutingKey = routingKey;
      } else {
        messageRoutingKey = this.deviceId();
        if (!(0, _isEmpty3.default)(channel)) {
          messageRoutingKey += '.' + channel;
        }
        if (!(0, _isEmpty3.default)(topic)) {
          messageRoutingKey += '.' + topic;
        }
      }
      return '/' + type + '/' + this.deviceId() + '/' + messageRoutingKey;
    }

    /**
     * Check if the SDK have to automatically ack messages
     * By default STOMP messages are acked by the server
     * they need to be acked if client subscribes with { ack: 'client' } option
     *
     * @private
     * @param {String} ack - the ack type, it should be 'client' or null
     * @return boolean - true if messages have to be autoacked, false otherwise
     */

  }, {
    key: '_autoAck',
    value: function _autoAck(ack) {
      if (ack) {
        if (!(0, _includes3.default)(CONFIG[this._protocol].ackTypes, ack)) {
          console.error('Wrong acknowledge type'); // eslint-disable-line no-console
        }
        switch (ack) {
          case 'client':
            return false;
          default:
            return true;
        }
      }
      return false;
    }
  }]);

  return StompClient;
}(_spacebunny2.default);

exports.default = StompClient;
//# sourceMappingURL=stompClient.js.map
