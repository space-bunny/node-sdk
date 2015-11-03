'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _amqplib = require('amqplib');

var _amqplib2 = _interopRequireDefault(_amqplib);

var _when = require('when');

var _when2 = _interopRequireDefault(_when);

var _spacebunny = require('../spacebunny');

var _spacebunny2 = _interopRequireDefault(_spacebunny);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * A module that exports an AmqpClient client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * which inherits from the SpaceBunny base client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * @module AmqpClient
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

// Import some helpers modules

// Import amqplib

// Import SpaceBunny main module from which AmqpClient inherits

var AmqpClient = (function (_SpaceBunny) {
  _inherits(AmqpClient, _SpaceBunny);

  /**
   * @constructor
   * @param {Object} opts - constructor options may contain api-key or connection options
   */

  function AmqpClient(opts) {
    _classCallCheck(this, AmqpClient);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AmqpClient).call(this, opts));

    _this._conn = undefined;
    _this._amqpChannels = {};
    _this._inputQueueArgs = {};
    _this._deviceExchangeArgs = {};
    _this._subscribeArgs = { noAck: true };
    _this._publishArgs = {};
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

  _createClass(AmqpClient, [{
    key: 'onReceive',
    value: function onReceive(callback, opts) {
      var _this2 = this;

      // Receive messages from imput queue
      return new _bluebird2.default(function (resolve, reject) {
        _this2._createChannel('input').then(function (channel) {
          _this2._amqpChannels.input = channel;
          return _this2._amqpChannels.input.checkQueue(_this2.deviceId() + '.input', _this2._inputQueueArgs);
        }).then(function () {
          return _this2._amqpChannels.input.consume(_this2.deviceId() + '.input', function (message) {
            callback(_this2._parseContent(message));
          }, (0, _merge2.default)(_this2._subscribeArgs, opts));
        }).then(function () {
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
     * @param {Object} message - the message payload
     * @return promise containing true if the
     */

  }, {
    key: 'publish',
    value: function publish(channel, message, opts) {
      var _this3 = this;

      return new _bluebird2.default(function (resolve, reject) {
        _this3._createChannel().then(function (ch) {
          _this3._amqpChannels.output = ch;
          return _when2.default.all([_this3._amqpChannels.output.checkExchange(_this3.deviceId()), _this3._amqpChannels.output.publish(_this3.deviceId(), _this3._routingKeyFor(channel), new Buffer(message), (0, _merge2.default)(_this3._publishArgs, opts))]);
        }).then(function (res) {
          resolve(res);
        }).catch(function (reason) {
          reject(reason);
        });
      });
    }

    /**
     * @private
     * Destroy the connection between the amqp client and broker
     *
     * @return a promise containing the result of the operation
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      var _this4 = this;

      return new _bluebird2.default(function (resolve, reject) {
        if (_this4._conn === undefined) {
          reject('Not Connected');
        } else {
          _this4._conn.close().then(function () {
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
     * Establish an amqp connection with the broker
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

      return new _bluebird2.default(function (resolve, reject) {
        if (_this5._conn !== undefined) {
          resolve(_this5._conn);
        } else {
          var connectionParams = _this5._connectionParams;
          var connectionString = 'amqp://' + connectionParams.device_id + ':' + connectionParams.secret + '@' + connectionParams.host + ':' + connectionParams.protocols.amqp.port + '/' + connectionParams.vhost.replace('/', '%2f');
          _amqplib2.default.connect(connectionString).then(function (conn) {
            process.once('SIGINT', function () {
              conn.close();
            });
            _this5._conn = conn;
            resolve(conn);
          }).catch(function (reason) {
            reject(reason);
          });
        }
      });
    }

    /**
     * @private
     * Create a channel on current connection, if connection does not
     * exists creates a new one. If channel already exists return
     * instance of that channel
     *
     * @param {String} channelType - indicates if the channel is input or output
     * @return a promise containing the current channel
     */

  }, {
    key: '_createChannel',
    value: function _createChannel() {
      var _this6 = this;

      return new _bluebird2.default(function (resolve, reject) {
        _this6._connect().then(function (conn) {
          return conn.createChannel();
        }).then(function (ch) {
          resolve(ch);
        }).catch(function (reason) {
          reject(reason);
        });
      });
    }

    /**
     * @private
     * Close a channel on current connection, if connection does not
     * exists creates a new one.
     *
     * @param {String} channelType - indicates if the channel is input or output
     * @return a promise containing the result of the operation
     */

  }, {
    key: '_closeChannel',
    value: function _closeChannel(channelType) {
      var _this7 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var ch = _this7._amqpChannels[channelType];
        if (ch === undefined) {
          reject('Invalid Channel Object');
        } else {
          ch.close().then(function () {
            resolve(true);
          }).catch(function (reason) {
            reject(reason);
          });
        }
      });
    }

    /**
     * @private
     * Generate the routing key for a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the routing key for that channel
     */

  }, {
    key: '_routingKeyFor',
    value: function _routingKeyFor(channel) {
      return this.deviceId() + '.' + channel;
    }

    /**
     * @private
     * Automatically parse message content
     *
     * @param {Object} message - the received message
     * @return an object containing the input message with parsed content
     */

  }, {
    key: '_parseContent',
    value: function _parseContent(message) {
      var parsedMessage = message;
      if (Buffer.isBuffer(parsedMessage.content)) {
        var content = parsedMessage.content.toString('utf-8');
        try {
          parsedMessage.content = JSON.parse(content);
        } catch (ex) {
          parsedMessage.content = content;
        }
      }
      return parsedMessage;
    }
  }]);

  return AmqpClient;
})(_spacebunny2.default);

exports.default = AmqpClient;
//# sourceMappingURL=amqp_client.js.map
