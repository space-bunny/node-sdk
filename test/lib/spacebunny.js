'use strict';

var appRoot = require('app-root-path');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should;
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var SpaceBunny = require(appRoot  + '/lib/spacebunny');
var SpaceBunnyErrors = require(appRoot + '/lib/spacebunny_errors');

describe('SpaceBunny', function() {

  var options = {};
  var client;
  context('#connection', function() {

    context('when no options are passed', function() {
      it('should throw ApiKeyOrConfigurationsRequired exception', function(done) {
        client = new SpaceBunny(options);
        expect(function(){client.connection()}).to.throw(SpaceBunnyErrors.ApiKeyOrConfigurationsRequired);
        done();
      });
    });

    context('when Api Key is passed', function() {
      it('should set connection parameters', function(done) {
        options.apiKey = '75833f07-b8e0-4767-9f9a-6ffb976d12c0:DTGmcSpjS_rXerxvPPzYZQ';
        var res = {
          connection: {
            host: "localhost",
            port: 5672,
            username: "75833f07-b8e0-4767-9f9a-6ffb976d12c0",
            password: "2kiqPkvx2tLDc7dcQSvYV37ogye8KDdSVUa5YUax",
            vhost: "/66787782"
          }
        };
        client = new SpaceBunny(options)
        expect(client.connection()).to.deep.eq(res.connection);
        done();
      });

      it('should raise EndPointError with wrong API', function(done) {
        options.apiKey = 'WRONG API';
        client = new SpaceBunny(options);
        expect(function(){client.connection()}).to.throw(SpaceBunnyErrors.EndPointError);
        done();
      });

    });

    context('when connection configurations are passed', function() {
      it('should set connection parameters', function(done) {
        options = {
          connection: {
            host: "localhost",
            port: 5672,
            username: "75833f07-b8e0-4767-9f9a-6ffb976d12c0",
            password: "2kiqPkvx2tLDc7dcQSvYV37ogye8KDdSVUa5YUax",
            vhost: "/66787782"
          }
        };
        client = new SpaceBunny(options)
        expect(client.connection()).to.deep.eq(options.connection);
        done();
      });
    });
  });


});
