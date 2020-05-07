import minimist from 'minimist';

import { AmqpClient } from '../../../src/index';

const args = minimist(process.argv.slice(2));

(async () => {
  // callback called when a message is received
  const messageCallback = (amqpMessage) => {
    console.log(amqpMessage); // eslint-disable-line no-console
  };

  // Prerequisites: you have created a device through the Space Bunny's web interface. You also have a 'data' channel (name
  // is not mandatory, but we'll use this for our example). You have also enabled 'data' channel for the device. See our
  // Getting Started [link] for a quick introduction to Space Bunny's base concepts.

  // Once everything is set up get your Device-Key from Space Bunny's web application: on the web interface,
  // go to devices section and create or pick an existing device. Click on the 'SHOW CONFIGURATION' link,
  // copy the Device-Key and substitute it here:
  const deviceKey = args.deviceKey || args['device-key'] || args.device_key || 'my-device-key';
  const tls = (args.tls !== false);
  const connectionParams = { deviceKey, tls };
  // You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io

  // You can also provide full manual configuration
  // const connectionParams = {
  //   deviceId: 'device-id',
  //   secret: 'device-secret',
  //   host: 'hostname',
  //   port: 5672, // default for AMQP
  //   vhost: 'vhost',
  //   channels: [ 'data', 'alarms' ]
  // };

  // If you want to connecto using a secure channel, you must enable tls
  // and provide the client certificate path
  // const connectionParams = {
  //   deviceKey: 'your-device-key',
  //   tls: true,
  //   ca: '/path/to/ca_certificate.pem',
  //   cert: '/path/to/client_certificate.pem',
  //   key: '/path/to/client_key.pem'
  // };

  // Let's instantiate a Space Bunny AMQP client, providing the Device-Key, that's the fastest and simplest method
  // to create a new client.
  const amqpClient = new AmqpClient(connectionParams);

  process.once('SIGINT', () => {
    amqpClient.disconnect().then((res) => {
      console.log('Bye Bye.'); // eslint-disable-line no-console
      const status = (res === true) ? 0 : 1;
      process.exit(status);
    });
  });

  // At this point the SDK is auto-configured and ready to use.
  // Configurations are automatically lazy-fetched by the SDK itself and the connection
  // will be opened calling the onReceive method

  // RECEIVING MESSAGES
  // 'onReceive' options:

  // noAck (default true) the broker won't expect an acknowledgement of messages delivered

  // 'discardFromApi' (default false) causes the SDK to filter out messages published through APIs (or WEB UI) or
  // generally sent directly through Space Bunny's platform.

  // 'discardMine' (default false) causes the SDK to filter out auto-messages i.e. messages sent from this device
  // and, for some reason, returned to the sender. This can happen in some particular situation such as when using m2m
  // groups.

  // 'allUpTo' (default true), all outstanding messages prior to and including the given message shall be considered acknowledged.
  // If false, or omitted, only the message supplied is acknowledged.

  // 'requeue' (default false) is truthy, the server will try to put the message or messages back on the queue or queues from which they came.
  const subscriptionOpts = { noAck: false, allUpTo: false, requeue: false, discardMine: false, discardFromApi: false };

  // When a message is sent on the inbox channel of the current device, the callback function will bel called
  await amqpClient.connect();
  await amqpClient.onReceive(messageCallback, subscriptionOpts);
  console.log('Start receiving..'); // eslint-disable-line no-console
})();
