'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _when = require('when');

var _when2 = _interopRequireDefault(_when);

var _amqplib = require('amqplib');

var _amqplib2 = _interopRequireDefault(_amqplib);

var _spacebunny = require('../spacebunny');

var _spacebunny2 = _interopRequireDefault(_spacebunny);

var _spacebunnyErrors = require('../spacebunnyErrors');

var _spacebunnyErrors2 = _interopRequireDefault(_spacebunnyErrors);

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
   * @param {Object} opts - options must contain api-key or connection options
   * (deviceId and secret) for devices.
   */

  function AmqpClient(opts) {
    _classCallCheck(this, AmqpClient);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AmqpClient).call(this, opts));

    _this._protocol = 'amqp';
    _this._protocolPrefix = 'amqp://';
    _this._sslProtocolPrefix = 'amqps://';
    _this._amqpConnection = undefined;
    _this._amqpChannels = {};
    _this._inputQueueArgs = {};
    _this._deviceExchangeArgs = {};
    _this._subscribeArgs = { noAck: true };
    _this._publishArgs = { withConfirm: false };
    _this._socketOptions = {
      frameMax: 32768, // 32 KB
      heartbeat: 60 // 60 seconds
    };
    _this.getConnectionParams();
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

  _createClass(AmqpClient, [{
    key: 'onReceive',
    value: function onReceive(callback, opts) {
      var _this2 = this;

      opts = (0, _merge2.default)(this._subscribeArgs, opts);
      // Receive messages from imput queue
      return new _bluebird2.default(function (resolve, reject) {
        _this2._createChannel('input', opts).then(function (ch) {
          return _when2.default.all([ch.checkQueue(_this2.deviceId() + '.' + _this2._inputTopic, _this2._inputQueueArgs), ch.consume(_this2.deviceId() + '.' + _this2._inputTopic, function (message) {
            callback(_this2._parseContent(message));
          }, opts)]);
        }).then(function (res) {
          resolve(res);
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
     * @return promise containing the result of the subscription
     */

  }, {
    key: 'publish',
    value: function publish(channel, message) {
      var _this3 = this;

      var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      opts = (0, _merge2.default)(this._publishArgs, opts);
      return new _bluebird2.default(function (resolve, reject) {
        _this3._createChannel('output', opts).then(function (ch) {
          var bufferedMessage = new Buffer(_this3._encapsulateContent(message));
          var promises = [ch.checkExchange(_this3.deviceId()), ch.publish(_this3.deviceId(), _this3._routingKeyFor(channel), bufferedMessage, opts)];
          if (opts.withConfirm === true) {
            promises.push(ch.waitForConfirms());
          }
          return _when2.default.all(promises);
        }).then(function (res) {
          resolve(res);
        }).catch(function (reason) {
          reject(reason);
        });
      });
    }

    /**
     * Destroy the connection between the amqp client and broker
     *
     * @return a promise containing the result of the operation
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      var _this4 = this;

      return new _bluebird2.default(function (resolve, reject) {
        if (_this4._amqpConnection === undefined) {
          reject('Not Connected');
        } else {
          _this4._amqpConnection.close().then(function () {
            _this4._amqpConnection = undefined;
            resolve(true);
          }).catch(function (reason) {
            reject(reason);
          });
        }
      });
    }

    // ------------ PRIVATE METHODS -------------------

    /**
     * Establish an amqp connection with the broker
     * using configurations retrieved from the endpoint.
     * If the connnection already exists, returns the current connnection
     *
     * @private
     * @return a promise containing current connection
     */

  }, {
    key: '_connect',
    value: function _connect() {
      var _this5 = this;

      var connectionOpts = (0, _merge2.default)({}, this._socketOptions);

      return new _bluebird2.default(function (resolve, reject) {
        if (_this5._amqpConnection !== undefined) {
          resolve(_this5._amqpConnection);
        } else {
          var connectionParams = _this5._connectionParams;
          // TODO if ssl change connections string and connection parameters
          var connectionString = '';
          if (_this5._ssl) {
            if (_this5._checkSslOptions()) {
              connectionString = '' + _this5._sslProtocolPrefix + (connectionParams.deviceId || connectionParams.client) + ':' + connectionParams.secret + '@' + connectionParams.host + ':' + connectionParams.protocols.amqp.sslPort + '/' + connectionParams.vhost.replace('/', '%2f');
              connectionOpts = (0, _merge2.default)(connectionOpts, _this5._sslOpts);
            } else {
              throw new _spacebunnyErrors2.default.ApiKeyOrConfigurationsRequired('Missing required SSL connection parameters');
            }
          } else {
            connectionString = '' + _this5._protocolPrefix + (connectionParams.deviceId || connectionParams.client) + ':' + connectionParams.secret + '@' + connectionParams.host + ':' + connectionParams.protocols.amqp.port + '/' + connectionParams.vhost.replace('/', '%2f');
          }
          _amqplib2.default.connect(connectionString, connectionOpts).then(function (conn) {
            conn.on('error', function (err) {
              reject(err);
            });
            conn.on('blocked', function (reason) {
              console.warn(reason); // eslint-disable-line no-console
            });
            conn.on('unblocked', function (reason) {
              console.warn(reason); // eslint-disable-line no-console
            });
            _this5._amqpConnection = conn;
            resolve(_this5._amqpConnection);
          }).catch(function (reason) {
            reject(reason);
          });
        }
      });
    }

    /**
     * Creates a channel on current connection
     *
     * @private
     * @param {String} channelName - indicates the channel name
     * @param {Object} opts - channel options
     * @return a promise containing the current channel
     */

  }, {
    key: '_createChannel',
    value: function _createChannel(channelName) {
      var _this6 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      return new _bluebird2.default(function (resolve, reject) {
        if (_this6._amqpChannels[channelName]) {
          resolve(_this6._amqpChannels[channelName]);
        } else {
          _this6._connect().then(function (conn) {
            if (opts.withConfirm === true) {
              return conn.createConfirmChannel();
            } else {
              return conn.createChannel();
            }
          }).then(function (ch) {
            _this6._amqpChannels[channelName] = ch;
            resolve(ch);
          }).catch(function (reason) {
            reject(reason);
          });
        }
      });
    }

    /**
     * Close a channel on current connection
     *
     * @private
     * @param {String} channelName - indicates if the channel is input or output
     * @return a promise containing the result of the operation
     */

  }, {
    key: '_closeChannel',
    value: function _closeChannel(channelName) {
      var _this7 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var ch = _this7._amqpChannels[channelName];
        if (ch === undefined) {
          reject('Invalid Channel Object');
        } else {
          ch.close().then(function () {
            this._amqpChannels[channelName] = undefined;
            resolve(true);
          }).catch(function (reason) {
            reject(reason);
          });
        }
      });
    }

    /**
     * Generate the routing key for a specific channel
     *
     * @private
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the routing key for that channel
     */

  }, {
    key: '_routingKeyFor',
    value: function _routingKeyFor(channel) {
      return this.deviceId() + '.' + channel;
    }

    /**
     * Automatically parse message content
     *
     * @private
     * @param {Object/String} message - the received message
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
//# sourceMappingURL=amqpClient.js.map
