import dotenv from 'dotenv';
import minimist from 'minimist';

import { AmqpClient } from '../../../src/index';
import { ISpaceBunnyParams } from '../../../src/spacebunny';

dotenv.config();
const args = minimist(process.argv.slice(2));

(async () => {
  try {
    // callback called when a message is received
    const messageCallback = (amqpMessage: any) => {
      console.log(amqpMessage); // eslint-disable-line no-console
    };

    // Prerequisites: you have created a device through the Space Bunny's web interface. You also have a 'data' channel (name
    // is not mandatory, but we'll use this for our example). You have also enabled 'data' channel for the device. See our
    // Getting Started [link] for a quick introduction to Space Bunny's base concepts.

    // Once everything is set up get your Device-Key from Space Bunny's web application: on the web interface,
    // go to devices section and create or pick an existing device. Click on the 'SHOW CONFIGURATION' link,
    // copy the Device-Key and substitute it here:
    const deviceKey = args.deviceKey || args['device-key'] || args.device_key || process.env.DEVICE_KEY;
    const tls = (args.tls !== 'false');
    let connectionParams: ISpaceBunnyParams = { tls, autoReconnect: false, heartbeat: 10, connectionTimeout: 5000 };

    if (deviceKey !== undefined) {
      connectionParams = { ...connectionParams, deviceKey };
    } else {
      // You can also provide full manual configuration
      connectionParams = {
        ...connectionParams,
        deviceId: process.env.DEVICE_ID,
        secret: process.env.SECRET,
        host: process.env.HOST,
        port: parseInt(process.env.PORT, 10) || 5671, // default for AMQPs
        vhost: process.env.VHOST,
      };
    }

    // You can also provide different endpoint configurations to use a different endpoint, default is api.spacebunny.io
    // connectionParams.endpoint = {
    //   protocol: 'http',
    //   secureProtocol: 'https',
    //   host: 'api.spacebunny.io',
    //   port: 80,
    //   securePort: 443,
    //   deviceConfigurationsPath: 'device_configurations',
    //   liveStreamKeyConfigurationsPath: 'live_stream_key_configurations'
    // };

    // If needed you can also provide the client certificates path
    // const connectionParams = {
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
      // eslint-disable-next-line no-console
      }).catch((error) => { console.error(error); });
    });

    // Bind log event
    // eslint-disable-next-line no-console
    amqpClient.on('log', (level, message) => { console.log(message); });

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

    // Connect the client
    await amqpClient.connect();

    // When a message is sent on the inbox channel of the current device, the callback function will bel called
    await amqpClient.onReceive(messageCallback, subscriptionOpts);
    console.log('Start receiving..'); // eslint-disable-line no-console
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
  }
})();
