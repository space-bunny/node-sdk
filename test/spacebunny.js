var expect = require('chai').expect,
    spacebunny = require('../spacebunny'),
    Client = spacebunny.Client;

describe('#constructor', function() {
  it('returns array of channels', function() {
    expect(Client({})).to.deep.equal({ channels: [ 'messages', 'alarms' ]});
  });
});
