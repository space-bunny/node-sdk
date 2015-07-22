'use strict';

var appRoot = require('app-root-path');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var StompClient = require(appRoot + '/lib/protocols/stomp_client');

describe('StompClient', function() {

  var options;
  var stompClient;

  beforeEach(function(){
    //  TODO get valid Apikey for current database    
    options = { apiKey: '2726ed64-e8a8-44ec-89d3-ea1900b5b049:8pXevK_ZTskzdPdCfXrjTQ' };
  });

  context('#publish', function() {

    it('should publish message on a specific channel', function() {
      stompClient = new StompClient(options);
      // var channel = stompClient.channels()[0];
      var channel = 'messages';
      stompClient.publish(channel, "my message").then(function(res) {
        expect(res).to.be.true;
      }).catch(function(reason) {
        console.error('publish fail %s', reason.stack);
      });
    });

  });
  //
  // context('#onReceive', function() {
  //
  //   it('should call receive callback', function(done) {
  //     var messageCallback = function(message) {
  //       console.log(message.content);
  //     }
  //
  //     var stompClient = new StompClient(options);
  //     stompClient.onReceive(messageCallback).then(function(res) {
  //       // expect(res).to.be.true;
  //       messageCallback.should.have.been.calledOnce;
  //     }).catch(function(reason) {
  //       console.error('onReceive fail %s', reason.stack);
  //     });
  //     done();
  //   });
  //
  // });
  //
  // context('#disconnect', function() {
  //   var options;
  //   var stompClient;
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
  // });


});
