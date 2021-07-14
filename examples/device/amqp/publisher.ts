import dotenv from 'dotenv';
import minimist from 'minimist';
import { promisify } from 'util';

import { AmqpClient } from '../../../src/indexNode';
import { ISpaceBunnyParams } from '../../../src/spacebunny';

dotenv.config();
const args = minimist(process.argv.slice(2));
(async () => {
  // Prerequisites: you have created a device through the Space Bunny's web interface. You also have a 'data' channel (name
  // is not mandatory, but we'll use this for our example). You have also enabled 'data' channel for the device. See our
  // Getting Started [link] for a quick introduction to Space Bunny's base concepts.

  // Once everything is set up get your Device-Key from Space Bunny's web application: on the web interface,
  // go to devices section and create or pick an existing device. Click on the 'SHOW CONFIGURATION' link,
  // copy the Device-Key and substitute it here:
  const deviceKey = args.deviceKey || args['device-key'] || args.device_key || process.env.DEVICE_KEY || 'my-device-key';
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

  // Connect the client
  await amqpClient.connect();

  // At this point the SDK is auto-configured and ready to use.
  // Configurations are automatically lazy-fetched by the SDK itself

  // PUBLISHING MESSAGES

  // As said in the prerequisites, we'll assume that 'data' channel is enabled for your device.
  // If you're in doubt, please check that this is true through Space Bunny's web interface, by clicking on the device
  // 'edit' (pencil icon) and verifying that 'data' channel is present and enabled for this device. Take a look at Getting
  // Started [link] for a quick introduction to Space Bunny's base concepts.

  // Let's publish, for instance, some JSON. Payload can be everything you want, Space Bunny does not impose any constraint
  // on format or content of payload.

  // Publish one message every second for a minute.
  for (let n = 0; n < 60; n += 1) {
    // 'publish' takes two mandatory arguments (channel's name and payload) and a variety of options: one of these options is
    // the 'withConfirm' flag: when set to true this requires Space Bunny's platform to confirm the receipt of the message.
    // This is useful when message delivery assurance is mandatory for your use case.
    // Take a look at SDK's documentation for further details.
    const content = { some: 'json' };
    const publishOpts = { withConfirm: true };
    // Select a channel or you can use amqpClient.channels() to get the complete channels' list
    const channel = args.channel || 'data';
    try {
      // eslint-disable-next-line no-await-in-loop
      await amqpClient.publish(channel, content, publishOpts);
      console.log(`Published message ${(n + 1)}`); // eslint-disable-line no-console
      if (n === 59) {
        // eslint-disable-next-line no-await-in-loop
        await amqpClient.disconnect();
      }
    } catch (error) {
      console.error(error); // eslint-disable-line no-console
    }
    const timeout = promisify(setTimeout);
    // eslint-disable-next-line no-await-in-loop
    await timeout((n + 1) * 1000);
  }

  // Bonus points:
  //
  // Space Bunny AMQP SDK uses "amqplib" [http://www.squaremobius.net/amqp.node/channel_api.html#channel_publish] under the hoods so it supports all the features and attributes provided
  // by the AMQP protocol. For instance, providing 'headers' or a 'timestamp' attribute is just a matter of adding it
  // as options after the payload:

  // 'timestamp' property and 'Timestamp' header can be used to provide a 'captured at' timestamp to data persisted
  // by 'Persistence' plugin. Learn more [link].
})();
