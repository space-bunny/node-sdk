'use strict';

var appRoot = require('app-root-path');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should;
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var AmqpClient = require(appRoot + '/lib/protocols/amqp_client');

describe('AmqpClient', function() {

  var options;
  var amqpClient;

  beforeEach(function(){
    options = { apiKey: '75833f07-b8e0-4767-9f9a-6ffb976d12c0:DTGmcSpjS_rXerxvPPzYZQ' };
    amqpClient = new AmqpClient(options);
  });

  context('#publish', function() {

    it('should publish message on a specific channel', function(done) {
      // var channel = amqpClient.channels()[0];
      var channel = 'messages';
      amqpClient.publish(channel, "my message").should.be.fulfilled;
      done();
    });

  });

  context('#onReceive', function() {

    it('should call receive callback', function(done) {
      var messageCallback = function(message) {
        console.log(message.content);
      }
      amqpClient.onReceive(messageCallback).should.be.fulfilled;
      done();
    });

  });

  context('#connect', function() {
    it('should be fulfilled', function(done) {
      amqpClient._connect().should.be.fulfilled;
      done();
    });
  });

  context('#disconnect', function() {

    it('should be resolved with open connection', function(done) {
      amqpClient._connect().then(function (conn) {
        amqpClient.disconnect().should.be.fulfilled;
        done();
      }).catch(function(reason) {
        console.error('fail %s', reason.stack);
      });
    });

    it('should be rejected with closed connection', function(done) {
      amqpClient.disconnect().should.be.rejected;
      done();
    });

  });

  it('should return routing key for a channel', function(done) {
    expect(amqpClient.routingKeyFor('channel')).to.be.eq(amqpClient.deviceId() + '.channel');
    done();
  });


});
