'use strict';

var appRoot = require('app-root-path');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should;
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var AmqpClient = require(appRoot  + '/index').AmqpClient;

describe('index', function() {
});
