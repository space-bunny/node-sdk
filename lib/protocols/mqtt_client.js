/**
 * A module that exports an MqttClient client
 * which inherits from the SpaceBunny base client
 * @module MqttClient
 */

'use strict';


// Import some helpers modules
var merge = require('merge');
var winston = require('winston');
var Promise = require('bluebird');

// Import mqtt library
var mqtt = require('mqtt');

// Import SpaceBunny main module from which MqttClient inherits
var SpaceBunny = require('../spacebunny');
var inherits = require('util').inherits;

/**
 * @constructor
 * @param {Object} opts - constructor options may contain api-key or connection options
 */
var MqttClient = function (opts) {
  SpaceBunny.call(this,opts);
  this._client = undefined;
  this._connectionOpts = { qos: 1 };
  this._connectTimeout = 5;
  this.connection();
};
inherits(MqttClient, SpaceBunny);

/**
 * Subscribe to input channel
 *
 * @param {function} callback - function called every time a message is receviced
 * passing the current message as argument
 * @param {Object} options - subscription options
 * @return promise containing the result of the subscription
 */
MqttClient.prototype.onReceive = function (callback, opts) {
  var parent = this;
  // subscribe for input messages
  return new Promise(function (resolve, reject) {
    parent._connect().then(function(client) {
      client.subscribe(parent._topicFor('input'), merge(parent._connectionOpts,opts), function(err, granted){
        if(err)
          reject(false)
        else {
          client.on('message', function (topic, message) {
            callback(topic, message);
          });
          resolve(true);
        }
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
MqttClient.prototype.publish = function (channel, message, opts) {
  var parent = this;
  // Publish message
  return new Promise(function (resolve, reject) {
    parent._connect().then(function(client) {
      client.publish(parent._topicFor(channel), new Buffer(message), merge(parent._connectionOpts,opts), function(res) {
        resolve(true);
      });
    }).catch(function(reason) {
      reject(reason);
    });
  });
};

/**
 * Destroy the connection between the mqtt client and broker
 *
 * @return a promise containing the result of the operation
 */
MqttClient.prototype.disconnect = function () {
  var parent = this;
  return new Promise(function (resolve, reject) {
    if(parent._client === undefined)
      reject('Invalid connection');
    else {
      parent._client.end().then(function (data) {
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
 * Establish an mqtt connection with the broker
 * using configurations retrieved from the endpoint
 *
 * @param {Object} opts - connection options
 * @return a promise containing current connection
 */
MqttClient.prototype._connect = function (opts) {
  opts = merge({}, opts);
  var connectionParams = this._connectionParams;
  var parent = this;

  return new Promise(function (resolve, reject) {
    if (parent._client !== undefined)
      resolve(parent._client);
    else {
      try {
        var client = mqtt.connect({
          host: connectionParams.host,
          port: connectionParams.protocols.mqtt.port,
          username: connectionParams.vhost + ':' + connectionParams.username,
          password: connectionParams.password,
          clientId: connectionParams.username,
          connectTimeout: opts.connectTimeout || parent._connectTimeout
        });
        client.on('error', function (reason) {
          reject(reason);
        });
        client.on('close', function (reason) {
          reject(reason);
        });
        parent._client = client;
        resolve(parent._client);
      } catch(reason) {
        reject(reason);
      }
    }
  });
};

/**
 * @private
 * Generate the topic for a specific channel
 *
 * @param {String} channel - channel name on which you want to publish a message
 * @return a string that represents the topic name for that channel
 */
MqttClient.prototype._topicFor = function (channel) {
  return this.deviceId().concat('/',channel);
};

module.exports = MqttClient;
