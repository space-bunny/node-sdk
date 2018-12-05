'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * A wrapper for the message object
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * @module Message
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */


var _utils = require('../utils');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../../config/constants'),
    CONFIG = _require.CONFIG;

var AmqpMessage = function () {
  /**
   * @constructor
   * @param {Object} message - the message received from the channel
   * @param {String} receiverId - the receiver id
   * @param {Object} opts - subscription options
   */
  function AmqpMessage() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, AmqpMessage);

    var _opts$message = opts.message,
        message = _opts$message === undefined ? undefined : _opts$message,
        _opts$receiverId = opts.receiverId,
        receiverId = _opts$receiverId === undefined ? undefined : _opts$receiverId,
        _opts$channel = opts.channel,
        channel = _opts$channel === undefined ? undefined : _opts$channel,
        _opts$subscriptionOpt = opts.subscriptionOpts,
        subscriptionOpts = _opts$subscriptionOpt === undefined ? {} : _opts$subscriptionOpt;

    this.message = message;
    this.content = (0, _utils.parseContent)(message.content);
    this.fields = message.fields;
    this.properties = message.properties;
    this.channel = channel;
    try {
      var _fields$routingKey$sp = this.fields.routingKey.split('.');

      var _fields$routingKey$sp2 = _slicedToArray(_fields$routingKey$sp, 2);

      this.senderId = _fields$routingKey$sp2[0];
      this.channelName = _fields$routingKey$sp2[1];
    } catch (ex) {
      console.error('Wrong routing key format'); // eslint-disable-line no-console
    }
    this._receiverId = receiverId;
    this._discardMine = subscriptionOpts.discardMine || false;
    this._discardFromApi = subscriptionOpts.discardFromApi || false;
  }

  /**
   * Check if a message should be accepted of rejected
   *
   * @return Boolean - true if should be not considered, false otherwise
   */


  _createClass(AmqpMessage, [{
    key: 'blackListed',
    value: function blackListed() {
      if (this._discardMine && this._receiverId === this.senderId && !this.fromApi()) return true;
      if (this._discardFromApi && this.fromApi()) return true;
      return false;
    }

    /**
     * Check if a message comes from API
     * Check if it contains 'x-from-sb-api' header
     *
     * @return Boolean - true if it comes from API, false otherwise
     */

  }, {
    key: 'fromApi',
    value: function fromApi() {
      return this.properties.headers && this.properties.headers[CONFIG.fromApiHeader];
    }
  }, {
    key: 'ack',
    value: function ack() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _opts$allUpTo = opts.allUpTo,
          allUpTo = _opts$allUpTo === undefined ? false : _opts$allUpTo;

      this.channel.nack(this.message, allUpTo);
    }
  }, {
    key: 'nack',
    value: function nack() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _opts$allUpTo2 = opts.allUpTo,
          allUpTo = _opts$allUpTo2 === undefined ? false : _opts$allUpTo2,
          _opts$requeue = opts.requeue,
          requeue = _opts$requeue === undefined ? true : _opts$requeue;

      this.channel.nack(this.message, allUpTo, requeue);
    }
  }]);

  return AmqpMessage;
}();

exports.default = AmqpMessage;
//# sourceMappingURL=amqpMessage.js.map
