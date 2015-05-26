'use strict';
var merge = require('merge');
var winston = require('winston');
var Promise = require('bluebird');
var SpaceBunny = require('../spacebunny');
var inherits = require('util').inherits;
var mqtt = require('mqtt');

var MqttClient = function (opts) {
  SpaceBunny.call(this,opts);
  this._client = undefined;
  this._connectionOpts = { qos: 1 };
  this._connectTimeout = 5;
  this.connection();
};
inherits(MqttClient, SpaceBunny);

/**
 * Space Bunny MqttClient connection
 *
 * @return promise containing current connection
 */
MqttClient.prototype.connect = function (opts) {
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

MqttClient.prototype.disconnect = function () {
  var parent = this;
  return new Promise(function (resolve, reject) {
    // if(parent._client === undefined)
    //   reject('Invalid connection');
    // else {
      parent._client.end().then(function (data) {
        resolve(true);
      }).catch(function (reason) {
        reject(reason);
      });
    // }
  });
};

MqttClient.prototype.onReceive = function (callback, opts) {
  var parent = this;
  // subscribe for input messages
  return new Promise(function (resolve, reject) {
    parent.connect().then(function(client) {
      client.subscribe(parent.topicFor('input'), merge(parent._connectionOpts,opts), function(err, granted){
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

MqttClient.prototype.publish = function (channel, message, opts) {
  var parent = this;
  // Publish message
  return new Promise(function (resolve, reject) {
    parent.connect().then(function(client) {
      client.publish(parent.topicFor(channel), new Buffer(message), merge(parent._connectionOpts,opts), function(res) {
        resolve(true);
      });
    }).catch(function(reason) {
      reject(reason);
    });
  });
};

MqttClient.prototype.topicFor = function (channel) {
  return this.deviceId().concat('/',channel);
};

module.exports = MqttClient;
