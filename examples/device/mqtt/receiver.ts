import dotenv from 'dotenv';
import minimist from 'minimist';

import { MqttClient } from '../../../src/indexNode';
import { ISpaceBunnyParams } from '../../../src/spacebunny';

dotenv.config();
const args = minimist(process.argv.slice(2));

(async () => {
  try {
    // callback called when a message is received
    const messageCallback = (topic: string, message: any) => {
      console.log(topic, message); // eslint-disable-line no-console
    };

    // Prerequisites: you have created a device through the Space Bunny's web interface. You also have a 'data' channel (name
    // is not mandatory, but we'll use this for our example). You have also enabled 'data' channel for the device. See our
    // Getting Started [link] for a quick introduction to Space Bunny's base concepts.

    // Once everything is set up get your Device-Key from Space Bunny's web application: on the web interface,
    // go to devices section and create or pick an existing device. Click on the 'SHOW CONFIGURATION' link,
    // copy the Device-Key and substitute it here:
    const deviceKey = args.deviceKey || args['device-key'] || args.device_key || process.env.DEVICE_KEY;
    const tls = (args.tls !== 'false');
    let connectionParams: ISpaceBunnyParams = { tls, heartbeat: 10, connectionTimeout: 5000 };

    if (deviceKey !== undefined) {
      connectionParams = { ...connectionParams, deviceKey };
    } else {
      // You can also provide full manual configuration
      connectionParams = {
        ...connectionParams,
        deviceId: process.env.DEVICE_ID,
        secret: process.env.SECRET,
        host: process.env.HOST,
        port: parseInt(process.env.PORT, 10) || 1883, // default for MQTTs
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
    const mqttClient = new MqttClient(connectionParams);
    process.once('SIGINT', () => {
      mqttClient.disconnect().then((res) => {
        console.log('Bye Bye.'); // eslint-disable-line no-console
        const status = (res === true) ? 0 : 1;
        process.exit(status);
        // eslint-disable-next-line no-console
      }).catch((error) => { console.error(error); });
    });

    // Bind log event
    // eslint-disable-next-line no-console
    mqttClient.on('log', (level, message) => { console.log(message); });

    // At this point the SDK is auto-configured and ready to use.
    // Configurations are automatically lazy-fetched by the SDK itself and the connection
    // will be opened calling the onReceive method

    // Connect the client
    await mqttClient.connect();

    // RECEIVING MESSAGES
    // 'onMessage' options:

    // When a message is sent on the inbox channel of the current device, the callback function will bel called
    await mqttClient.onMessage(messageCallback);
    console.log('Start receiving..'); // eslint-disable-line no-console
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
  }
})();
