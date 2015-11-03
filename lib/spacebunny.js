'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        * A module that exports the base SpaceBunny client
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        * @module SpaceBunny
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        */

// Import some helpers modules

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _syncRequest = require('sync-request');

var _syncRequest2 = _interopRequireDefault(_syncRequest);

var _spacebunny_errors = require('./spacebunny_errors');

var _spacebunny_errors2 = _interopRequireDefault(_spacebunny_errors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CONFIG = require('../config/constants').CONFIG;

// Import Space Bunny errors

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */

var SpaceBunny = (function () {
  function SpaceBunny(opts) {
    _classCallCheck(this, SpaceBunny);

    this._opts = (0, _merge2.default)({}, opts);
    this._connectionParams = this._opts.connection;
    this._apiKey = this._opts.apiKey;
    this._endPoint = this._opts.endPoint;
    this._channels = this._opts.channels;
    this._endPointConfigs = this._opts.endPointConfigs;
    this._deviceId = this._opts.deviceId;
  }

  /**
   * Check if api-key or connection parameters have already been passed
   * If at least api-key is passed ask the endpoint for the configurations
   * else if also connection parameters are not passed raise an exception
   *
   * @return an Object containing the connection parameters
   */

  _createClass(SpaceBunny, [{
    key: 'connection',
    value: function connection() {
      if (this._apiKey !== undefined && this._connectionParams === undefined) {
        this._connectionParams = this._endPointConfigurations().connection;
      } else if (this._apiKey === undefined && this._connectionParams === undefined) {
        throw new _spacebunny_errors2.default.ApiKeyOrConfigurationsRequired('Missing configurations');
      }
      return this._connectionParams;
    }

    /**
     * @return all channels configured for the current device
     */

  }, {
    key: 'channels',
    value: function channels() {
      this._channels = this._endPointConfigs.channels || this._channels;
      return this._channels.map(function (obj) {
        return obj.name;
      });
    }

    /**
     * @return the device ID for the current device
     */

  }, {
    key: 'deviceId',
    value: function deviceId() {
      this._deviceId = this._deviceId || this._connectionParams.device_id;
      return this._deviceId;
    }

    // ------------ PRIVATE METHODS -------------------

    /**
     * @private
     * Return configs from the Space Bunny ndpoint
     * it caches configurations so if you ask multiple
     * time for configurations it makes only one request
     *
     * @return an Object containing endpoint configurations
     */

  }, {
    key: '_endPointConfigurations',
    value: function _endPointConfigurations() {
      if (this._endPointConfigs !== undefined) {
        return this._endPointConfigs;
      }

      // Contact endpoint to retrieve configs
      var uri = 'http://' + CONFIG.endpoint.url + CONFIG.endpoint.api_version + CONFIG.endpoint.path;
      try {
        var args = { headers: { 'Api-Key': this._apiKey } };
        var response = (0, _syncRequest2.default)('GET', uri, args);
        this._endPointConfigs = JSON.parse(response.getBody());
        return this._endPointConfigs;
      } catch (ex) {
        throw new _spacebunny_errors2.default.EndPointError(ex);
      }
    }
  }]);

  return SpaceBunny;
})();

exports.default = SpaceBunny;
//# sourceMappingURL=spacebunny.js.map
