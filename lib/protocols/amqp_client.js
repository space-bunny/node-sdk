'use strict';
var merge = require('merge');
var winston = require('winston');
var Promise = require('bluebird');
var SpaceBunny = require('../spacebunny');
var inherits = require('util').inherits;
var amqp = require('amqplib');

var AmqpClient = function (opts) {
  SpaceBunny.call(this,opts);
  this._conn = undefined;
  this._inputChannel = undefined;
  this._outputChannel = undefined;
  this._inputQueueArgs = { durable: true };
  this._deviceExchangeArgs = { durable: true };
  this._subscribeArgs = { noAck: true };
  this._publishArgs = {};
  this.connection();
};
inherits(AmqpClient, SpaceBunny);

/**
 * Space Bunny AmqpClient connection
 *
 * @return promise containing current connection
 */
AmqpClient.prototype.connect = function (opts) {
  var connectionParams = this._connectionParams;
  var parent = this;
  var connection_string = 'amqp://'.concat(connectionParams.username, ':', connectionParams.password,'@',
    connectionParams.host, ':', connectionParams.port, '/', connectionParams.vhost.replace('/', '%2f'));

  return new Promise(function (resolve, reject) {
    if (parent._conn !== undefined)
      resolve(parent._conn);
    else {
      amqp.connect(connection_string).then(function(conn) {
        process.once('SIGINT', function() { conn.close(); });
        parent._conn = conn;
        resolve(parent._conn);
      }).catch( function (reason) {
        reject(reason);
      });
    }
  });
};

AmqpClient.prototype.disconnect = function () {
  var parent = this;
  return new Promise(function (resolve, reject) {
    // if(parent._conn === undefined)
    //   reject('Invalid connection');
    // else {
      parent._conn.close().then(function (data) {
        resolve(true);
      }).catch(function (reason) {
        reject(reason);
      });
    // }
  });
};

AmqpClient.prototype.createChannel = function () {
  var parent = this;
  return new Promise(function (resolve, reject) {
    parent.connect().then(function(conn) {
        return conn.createChannel();
    }).then(function(ch) {
      resolve(ch);
    }).catch(function(reason) {
      reject(reason);
    });
  });
};

AmqpClient.prototype.closeChannel = function (channelType) {
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


AmqpClient.prototype.onReceive = function (opts, callback) {
  var parent = this;
  // Receive messages
  return new Promise(function (resolve, reject) {
    parent.createChannel('input').then(function(channel) {
      parent._inputChannel = channel;
      return parent._inputChannel.assertQueue(parent.deviceId() + '.input', parent._inputQueueArgs);
    }).then(function(queueOk) {
      return parent._inputChannel.consume(parent.deviceId() + '.input', function(message) {
        console.log(message);
        callback(message);
      }, merge(parent._subscribeArgs, opts) );
    }).then(null, console.warn).catch(function(reason) {
      reject(reason);
    });
  });
};

AmqpClient.prototype.publish = function (channel, message, opts) {
  var parent = this;
  // Publish message
  return new Promise(function (resolve, reject) {
    parent.createChannel('output').then(function(channel) {
      parent._outputChannel = channel;
      return parent._outputChannel.assertExchange(parent.deviceId(), 'direct', parent._deviceExchangeArgs);
    }).then(function(exOk) {
      parent._outputChannel.publish(parent.deviceId(), parent.routingKeyFor(channel) , new Buffer(message),
        merge(parent._publishArgs, opts));
      resolve(true);
    }).catch(function(reason) {
      reject(reason);
    });
  });
};

AmqpClient.prototype.routingKeyFor = function (channel) {
  return this.deviceId().concat('.',channel);
};

module.exports = AmqpClient;
