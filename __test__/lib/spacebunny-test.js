
describe( 'SpaceBunny', function() {
  context('#connection', function() {
    context('when no options are passed', function() {
      it('should throw ApiKeyOrConfigurationsRequired exception', function() {
        // client = new SpaceBunny(options);
        // expect(function(){client.connection()}).to.throw(SpaceBunnyErrors.ApiKeyOrConfigurationsRequired);
        // done();
        expect(false).toBe(true);
      });
    });
  });

  //   context('when Api Key is passed', function() {
  //     it('should set connection parameters', function(done) {
  //       options.apiKey = '2726ed64-e8a8-44ec-89d3-ea1900b5b049:8pXevK_ZTskzdPdCfXrjTQ';
  //       var res = {
  //         connection: {
  //           host: "localhost",
  //           protocols: {
  //             "amqp": {
  //               "port": 5672
  //             },
  //             "mqtt": {
  //               "port": 1883
  //             },
  //             "stomp": {
  //               "port": 61613
  //             },
  //             "web_stomp": {
  //               "port": 15674
  //             }
  //           },
  //           device_id: "2726ed64-e8a8-44ec-89d3-ea1900b5b049",
  //           secret: "Eo7en6TVjomJg45oH7iJjNmBgdtP8G9kURZrHzQa",
  //           vhost: "/28507946"
  //         }
  //       };
  //       client = new SpaceBunny(options)
  //       expect(client.connection()).to.deep.eq(res.connection);
  //       done();
  //     });
  //
  //     it('should raise EndPointError with wrong API', function(done) {
  //       options.apiKey = 'WRONG API';
  //       client = new SpaceBunny(options);
  //       expect(function(){client.connection()}).to.throw(SpaceBunnyErrors.EndPointError);
  //       done();
  //     });
  //
  //   });
  //
  //   context('when connection configurations are passed', function() {
  //     it('should set connection parameters', function(done) {
  //       options = {
  //         connection: {
  //           host: "localhost",
  //           port: 5672,
  //           username: "75833f07-b8e0-4767-9f9a-6ffb976d12c0",
  //           password: "2kiqPkvx2tLDc7dcQSvYV37ogye8KDdSVUa5YUax",
  //           vhost: "/66787782"
  //         }
  //       };
  //       client = new SpaceBunny(options)
  //       expect(client.connection()).to.deep.eq(options.connection);
  //       done();
  //     });
  //   });
  // });
});
