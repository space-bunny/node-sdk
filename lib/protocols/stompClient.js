'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _stompjs = require('stompjs');

var _stompjs2 = _interopRequireDefault(_stompjs);

var _spacebunny = require('../spacebunny');

var _spacebunny2 = _interopRequireDefault(_spacebunny);

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


var CONFIG = require('../../config/constants').CONFIG;

var StompClient = function (_SpaceBunny) {
  _inherits(StompClient, _SpaceBunny);

  /**
   * @constructor
   * @param {Object} opts - options must contain api-key or connection options
   * (deviceId and secret) for devices.
   */

  function StompClient(opts) {
    _classCallCheck(this, StompClient);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(StompClient).call(this, opts));

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
    _this._existingQueuePrefix = stompOpts.existingQueuePrefix;
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
    value: function onReceive(callback, opts) {
      var _this2 = this;

      opts = (0, _merge2.default)({}, opts);
      // subscribe for input messages
      return new _bluebird2.default(function (resolve, reject) {
        _this2._connect().then(function (client) {
          // amq/queue is the form for existing queues
          _this2._subscription = client.subscribe(_this2._subcriptionFor(_this2._existingQueuePrefix, _this2._inboxTopic), function (message) {
            // TODO filterMine and filterWeb
            callback(message);
          }, function (reason) {
            reject(reason);
          });
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
    value: function publish(channel, message, opts) {
      var _this3 = this;

      opts = (0, _merge2.default)({}, opts);
      // Publish message
      return new _bluebird2.default(function (resolve, reject) {
        _this3._connect().then(function (client) {
          var destination = _this3._destinationFor('exchange', channel);
          client.send(destination, _this3._connectionHeaders, _this3._encapsulateContent(message));
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
        if (_this4._stompConnection === undefined) {
          reject('Invalid connection');
        } else {
          if (_this4._subscription !== undefined) {
            _this4._subscription.unsubscribe();
          }
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
     * Establish an stomp connection with the broker.
     * If a connection already exists, returns the current connection
     *
     * @private
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */

  }, {
    key: '_connect',
    value: function _connect(opts) {
      var _this5 = this;

      opts = (0, _merge2.default)({}, opts);
      return new _bluebird2.default(function (resolve, reject) {
        _this5.getEndpointConfigs().then(function (endpointConfigs) {
          var connectionParams = endpointConfigs.connection;
          if (_this5._stompConnection !== undefined) {
            resolve(_this5._stompConnection);
          } else {
            try {
              (function () {
                var client = undefined;
                if ((typeof process === 'undefined' ? 'undefined' : _typeof(process)) === 'object' && '' + process === '[object process]') {
                  // code is runnning in nodejs: STOMP uses TCP sockets
                  if (_this5._ssl) {
                    client = _stompjs2.default.overTCP(connectionParams.host, connectionParams.protocols.stomp.sslPort, _this5._sslOpts);
                  } else {
                    client = _stompjs2.default.overTCP(connectionParams.host, connectionParams.protocols.stomp.port);
                  }
                } else {
                  // code is runnning in a browser: web STOMP uses Web sockets
                  var protocol = _this5._ssl ? _this5._webSocketOpts.ssl.protocol : _this5._webSocketOpts.protocol;
                  var port = _this5._ssl ? connectionParams.protocols.webStomp.sslPort : connectionParams.protocols.webStomp.port;
                  var connectionString = protocol + '://' + connectionParams.host + ':' + port + '/' + _this5._webSocketOpts.endpoint;
                  var ws = new WebSocket(connectionString);
                  client = _stompjs2.default.over(ws);
                  client.heartbeat.outgoing = 10000;
                  client.heartbeat.incoming = 10000;
                  client.debug = null;
                }
                var headers = (0, _merge2.default)(_this5._connectionHeaders, {
                  login: connectionParams.deviceId || connectionParams.client,
                  passcode: connectionParams.secret,
                  host: connectionParams.vhost
                });
                client.connect(headers, function () {
                  _this5._stompConnection = client;
                  resolve(_this5._stompConnection);
                }, function (err) {
                  reject(err);
                });
              })();
            } catch (reason) {
              reject(reason);
            }
          }
        }).catch(function (reason) {
          reject(reason);
        });
      });
    }

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
    value: function _destinationFor(type, channel) {
      return '/' + type + '/' + this.deviceId() + '/' + this.deviceId() + '.' + channel;
    }
  }]);

  return StompClient;
}(_spacebunny2.default);

exports.default = StompClient;
//# sourceMappingURL=stompClient.js.map
