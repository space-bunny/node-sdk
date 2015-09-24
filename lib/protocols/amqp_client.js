/**
 * A module that exports an AmqpClient client
 * which inherits from the SpaceBunny base client
 * @module AmqpClient
 */

'use strict';

// Import some helpers modules
var merge = require('merge');
var Promise = require('bluebird');
// Import amqplib
var amqp = require('amqplib');
var when = require('when');

// Import SpaceBunny main module from which AmqpClient inherits
var SpaceBunny = require('../spacebunny');
var inherits = require('util').inherits;

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */
var AmqpClient = function (opts) {
  SpaceBunny.call(this,opts);
  this._conn = undefined;
  this._inputChannel = undefined;
  this._outputChannel = undefined;
  this._inputQueueArgs = { };
  this._deviceExchangeArgs = { };
  this._subscribeArgs = { noAck: true };
  this._publishArgs = {};
  this.connection();
};
inherits(AmqpClient, SpaceBunny);

/**
 * Subscribe to input channel
 *
 * @param {function} callback - function called every time a message is receviced
 * passing the current message as argument
 * @param {Object} options - subscription options
 * @return promise containing the result of the subscription
 */
AmqpClient.prototype.onReceive = function (callback, opts) {
  var parent = this;
  // Receive messages from imput queue
  return new Promise(function (resolve, reject) {
    parent._createChannel('input').then(function(channel) {
      parent._inputChannel = channel;
      return parent._inputChannel.checkQueue(parent.deviceId() + '.input', parent._inputQueueArgs);
    }).then(function(queueOk) {
      return parent._inputChannel.consume(parent.deviceId() + '.input', function(message) {
        callback(message);
      }, merge(parent._subscribeArgs, opts) );
    }).then(function(res) {
      resolve(true);
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
AmqpClient.prototype.publish = function (channel, message, opts) {
  var parent = this;
  return new Promise(function (resolve, reject) {
    parent._createChannel('output').then(function(channel) {
      parent._outputChannel = channel;
      return when.all([
        parent._outputChannel.checkExchange(parent.deviceId()),
        parent._outputChannel.publish(parent.deviceId(), parent.routingKeyFor(channel) , new Buffer(message),
          merge(parent._publishArgs, opts))
      ]);
    }).then(function(res) {
      resolve(res);
    }).catch(function(reason) {
      reject(reason);
    });
  });
};

/**
 * @private
 * Destroy the connection between the amqp client and broker
 *
 * @return a promise containing the result of the operation
 */
AmqpClient.prototype.disconnect = function () {
  var parent = this;
  return new Promise(function (resolve, reject) {
    if(parent._conn === undefined)
      reject('Not Connected');
    else {
      parent._conn.close().then(function (res) {
        resolve(true);
      }).catch(function(reason) {
        reject(reason);
      });
    }
  });
};

// ------------ PRIVATE METHODS -------------------

/**
 * @private
 * Establish an amqp connection with the broker
 * using configurations retrieved from the endpoint
 *
 * @param {Object} opts - connection options
 * @return a promise containing current connection
 */
AmqpClient.prototype._connect = function (opts) {
  var connectionParams = this._connectionParams;
  var parent = this;
  var connection_string = 'amqp://'.concat(connectionParams.device_id, ':', connectionParams.secret,'@',
    connectionParams.host, ':', connectionParams.protocols.amqp.port, '/', connectionParams.vhost.replace('/', '%2f'));

  return new Promise(function (resolve, reject) {
    if (parent._conn !== undefined)
      resolve(parent._conn);
    else {
      amqp.connect(connection_string).then(function(conn) {
        process.once('SIGINT', function() { conn.close(); });
        parent._conn = conn;
        resolve(conn);
      }).catch( function (reason) {
        reject(reason);
      });
    }
  });
};

/**
 * @private
 * Create a channel on current connection, if connection does not
 * exists creates a new one. If channel already exists return
 * instance of that channel
 *
 * @param {String} channelType - indicates if the channel is input or output
 * @return a promise containing the current channel
 */
AmqpClient.prototype._createChannel = function (channelType) {
  var parent = this;
  return new Promise(function (resolve, reject) {
    parent._connect().then(function(conn) {
        return conn.createChannel();
    }).then(function(ch) {
      resolve(ch);
    }).catch(function(reason) {
      reject(reason);
    });
  });
};

/**
 * @private
 * Close a channel on current connection, if connection does not
 * exists creates a new one.
 *
 * @param {String} channelType - indicates if the channel is input or output
 * @return a promise containing the result of the operation
 */
AmqpClient.prototype._closeChannel = function (channelType) {
  var ch = this[ '_'.concat(channelType,'Channel')];
  return new Promise(function (resolve, reject) {
    if(ch === undefined)
      reject('Invalid Channel Object');
    else {
      ch.close().then(function() {
        resolve(true);
      }).catch(function(reason) {
        reject(reason);
      });
    }
  });
};

/**
 * @private
 * Generate the routing key for a specific channel
 *
 * @param {String} channel - channel name on which you want to publish a message
 * @return a string that represents the routing key for that channel
 */
AmqpClient.prototype.routingKeyFor = function (channel) {
  return this.deviceId().concat('.',channel);
};

module.exports = AmqpClient;
