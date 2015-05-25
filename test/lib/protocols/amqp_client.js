'use strict';

var appRoot = require('app-root-path');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
// var AmqpClient = require(appRoot + '/lib/protocols/amqp_client');
var AmqpClient = require(appRoot  + '/index').AmqpClient;

describe('AmqpClient', function() {

  var options;
  var amqpClient;

  beforeEach(function(){
    options = { apiKey: '75833f07-b8e0-4767-9f9a-6ffb976d12c0:DTGmcSpjS_rXerxvPPzYZQ' };
  });

  context('#publish', function() {

    it('should publish message on a specific channel', function(done) {
      amqpClient = new AmqpClient(options);
      // var channel = amqpClient.channels()[0];
      var channel = 'messages';
      amqpClient.publish(channel, "my message").then(function(res) {
        expect(res).to.be.true;
      }).catch(function(reason) {
        console.error('publish fail %s', reason.stack);
      });
      done();
    });

  });

  context('#onReceive', function() {

    it('should call receive callback', function(done) {
      var messageCallback = function(message) {
        console.log(message.content);
      }

      var amqpClient = new AmqpClient(options);
      amqpClient.onReceive(messageCallback).then(function(res) {
        // expect(res).to.be.true;
        messageCallback.should.have.been.calledOnce;
      }).catch(function(reason) {
        console.error('onReceive fail %s', reason.stack);
      });
      done();
    });

  });

  // context('#disconnect', function() {
  //   var options;
  //   var amqpClient;
  //
  //   beforeEach(function(){
  //     options = {
  //       host: 'localhost',
  //       user: 'rabbi',
  //       password: 'rabbi',
  //       port: 5672,
  //       vhost: '/'
  //     };
  //   });
  //
  //   // it('should be resolved with open connection', function() {
  //   //   amqpClient = new AmqpClient(options);
  //   //   amqpClient.connect().then(function (conn) {
  //   //     expect(amqpClient.disconnect()).to.eventually.be.fulfilled;
  //   //   }).catch(console.log.bind(console));
  //   // });
  //   //
  //   // it('should be rejected with already closed connection', function() {
  //   //   amqpClient = new AmqpClient(options)
  //   //   amqpClient.connect().then(function (conn) {
  //   //     return amqpClient.disconnect();
  //   //   }).then(function (data) {
  //   //       expect(amqpClient.disconnect()).to.eventually.be.rejected;
  //   //   });
  //   // });
  //
  // });


});
