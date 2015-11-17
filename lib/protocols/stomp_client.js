'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _stompjs = require('stompjs');

var _stompjs2 = _interopRequireDefault(_stompjs);

var _spacebunny = require('../spacebunny');

var _spacebunny2 = _interopRequireDefault(_spacebunny);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { return obj && obj.constructor === Symbol ? "symbol" : typeof obj; }

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

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */

var StompClient = (function (_SpaceBunny) {
  _inherits(StompClient, _SpaceBunny);

  function StompClient(opts) {
    _classCallCheck(this, StompClient);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(StompClient).call(this, opts));

    _this._client = undefined;
    _this._connectionHeaders = {
      'max_hbrlck_fails': 10,
      'accept-version': '1.0,1.1,1.2',
      'heart-beat': '10000,10000'
    };
    _this.connection();
    return _this;
  }

  /**
   * Subscribe to input channel
   *
   * @param {function} callback - function called every time a message is receviced
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
          client.subscribe(_this2._subcriptionFor('amq/queue', 'input'), function (message) {
            callback(message);
            resolve(true);
          });
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
     * @param {Object} message - the message payload
     * @return promise containing true if the
     */

  }, {
    key: 'publish',
    value: function publish(channel, message, opts) {
      var _this3 = this;

      opts = (0, _merge2.default)({}, opts);
      // Publish message
      return new _bluebird2.default(function (resolve, reject) {
        _this3._connect().then(function (client) {
          client.send(_this3._destinationFor('exchange', channel), _this3._connectionHeaders, _this3._encapsulateContent(message));
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
        if (_this4._client === undefined) {
          reject('Invalid connection');
        } else {
          _this4._client.disconnect().then(function () {
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
     * Establish an stomp connection with the broker
     * using configurations retrieved from the endpoint
     *
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */

  }, {
    key: '_connect',
    value: function _connect(opts) {
      var _this5 = this;

      opts = (0, _merge2.default)({}, opts);
      var connectionParams = this._connectionParams;

      return new _bluebird2.default(function (resolve, reject) {
        if (_this5._client !== undefined) {
          resolve(_this5._client);
        } else {
          try {
            (function () {
              var client = undefined;
              if ((typeof process === 'undefined' ? 'undefined' : _typeof(process)) === 'object' && process + '' === '[object process]') {
                // code is runnning in nodejs: STOMP uses TCP sockets
                client = _stompjs2.default.overTCP(connectionParams.host, connectionParams.protocols.stomp.port);
              } else {
                var SockJS = require('sockjs-client');
                // code is runnning in a browser: web STOMP uses Web sockets
                var connectionString = 'http://' + connectionParams.host + ':' + connectionParams.protocols.web_stomp.port + '/stomp';
                var ws = new SockJS(connectionString);
                client = _stompjs2.default.over(ws);
                // SockJS does not support heart-beat: disable heart-beats
                client.heartbeat.outgoing = 0;
                client.heartbeat.incoming = 0;
              }
              var headers = (0, _merge2.default)(_this5._connectionHeaders, {
                login: connectionParams.device_id,
                passcode: connectionParams.secret,
                host: connectionParams.vhost
              });
              client.connect(headers, function () {
                _this5._client = client;
                resolve(_this5._client);
              }, function (err) {
                reject(err);
              });
            })();
          } catch (reason) {
            reject(reason);
          }
        }
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
    key: '_subcriptionFor',
    value: function _subcriptionFor(type, channel) {
      return '/' + type + '/' + this.deviceId() + '.' + channel;
    }

    /**
     * @private
     * Generate the destination string for a specific channel
     *
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
})(_spacebunny2.default);

exports.default = StompClient;
//# sourceMappingURL=stomp_client.js.map
