/**
 * A module that exports an StompClient client
 * which inherits from the SpaceBunny base client
 * @module StompClient
 */

'use strict';


// Import some helpers modules
var merge = require('merge');
var Promise = require('bluebird');

// Import stomp library
var Stomp = require('stompjs');

// Import SpaceBunny main module from which StompClient inherits
var SpaceBunny = require('../spacebunny');
var inherits = require('util').inherits;

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */
var StompClient = function (opts) {
  SpaceBunny.call(this,opts);
  this._client = undefined;
  this._connectionHeaders = {
    'max_hbrlck_fails': 10,
    'accept-version': '1.0,1.1,1.2',
    'heart-beat': '10000,10000'
  };
  this.connection();
};
inherits(StompClient, SpaceBunny);

/**
 * Subscribe to input channel
 *
 * @param {function} callback - function called every time a message is receviced
 * passing the current message as argument
 * @param {Object} options - subscription options
 * @return promise containing the result of the subscription
 */
StompClient.prototype.onReceive = function (callback, opts) {
  var parent = this;
  // subscribe for input messages
  return new Promise(function (resolve, reject) {
    parent._connect().then(function(client) {
      client.subscribe(parent._subcriptionFor('queue', 'input'), function(message){
        callback(message);
        resolve(true);
      });
    }).catch(function(reason) {
      reject(reason);
    });
  });
};

/**
 * Publish a message on a specific channel
 *
 * @param {String} channel - channel name on which you want to publish a message
 * @param {Object} message - the message payload
 * @param {Object} message - the message payload
 * @return promise containing true if the
 */
StompClient.prototype.publish = function (channel, message, opts) {
  var parent = this;
  // Publish message
  return new Promise(function (resolve, reject) {
    parent._connect().then(function(client) {
      client.send(parent._destinationFor('exchange', channel), parent._connectionHeaders, message);
      resolve(true);
    }).catch(function(reason) {
      reject(reason);
    });
  });
};

/**
 * Destroy the connection between the stomp client and broker
 *
 * @return a promise containing the result of the operation
 */
StompClient.prototype.disconnect = function () {
  var parent = this;
  return new Promise(function (resolve, reject) {
    if(parent._client === undefined)
      reject('Invalid connection');
    else {
      parent._client.disconnect().then(function (data) {
        resolve(true);
      }).catch(function (reason) {
        reject(reason);
      });
    }
  });
};

// ------------ PRIVATE METHODS -------------------

/**
 * @private
 * Establish an stomp connection with the broker
 * using configurations retrieved from the endpoint
 *
 * @param {Object} opts - connection options
 * @return a promise containing current connection
 */
StompClient.prototype._connect = function (opts) {
  opts = merge({}, opts);
  var connectionParams = this._connectionParams;
  var parent = this;

  return new Promise(function (resolve, reject) {
    if (parent._client !== undefined)
      resolve(parent._client);
    else {
      try {
        var client = undefined;
        if(typeof process === 'object' && process + '' === '[object process]'){
          // code is runnning in nodejs: STOMP uses TCP sockets
          client = Stomp.overTCP(connectionParams.host, connectionParams.protocols.stomp.port);
        } else {
          var SockJS = require('sockjs-client');
          // code is runnning in a browser: web STOMP uses Web sockets
          var connectionString = 'http://' + connectionParams.host + ':' + connectionParams.protocols.web_stomp.port + '/stomp';
          var ws = new SockJS(connectionString);
          client = Stomp.over(ws);
          // SockJS does not support heart-beat: disable heart-beats
          client.heartbeat.outgoing = 0;
          client.heartbeat.incoming = 0;
        }
        var headers = merge(parent._connectionHeaders, {
          login: connectionParams.device_id,
          passcode: connectionParams.secret,
          host: connectionParams.vhost
        });
        client.connect(headers, function(frame) {
          parent._client = client;
          resolve(parent._client);
        }, function(err) {
          reject(err);
        });
      } catch(reason) {
        reject(reason);
      }
    }
  });
};

/**
 * @private
 * Generate the subscription string for a specific channel
 *
 * @param {String} type - resource type on which subscribe or publish [exchange/queue]
 * @param {String} channel - channel name on which you want to publish a message
 * @return a string that represents the topic name for that channel
 */
StompClient.prototype._subcriptionFor = function (type, channel) {
  return '/' + type + '/' + this.deviceId() + '.' + channel ;
};

/**
 * @private
 * Generate the destination string for a specific channel
 *
 * @param {String} type - resource type on which subscribe or publish [exchange/queue]
 * @param {String} channel - channel name on which you want to publish a message
 * @return a string that represents the topic name for that channel
 */
StompClient.prototype._destinationFor = function (type, channel) {
  return '/' + type + '/' + this.deviceId() + '/' + this.deviceId() + '.' + channel ;
};

// /**
//  * @private
//  * Parses a message before send
//  *
//  * @param {Object} message - message
//  * @return a parsed message suitable for sending
//  */
// StompClient.prototype._parseMessage = function (message) {
//   try {
//     JSON.parse(message);
//     message = JSON.stringify(message);
//   } catch (e) {
//     return message;
//   }
//   return message ;
// };

module.exports = StompClient;
