var expect = require('chai').expect;
var client = require('../spacebunny');

describe('#constructor', function() {
  it('returns an object containing configurations', function() {
    expect(client.authenticate()).to.deep.equal({ channels: [ 'messages', 'alarms' ]});
  });
});
