import dotenv from 'dotenv';
import minimist from 'minimist';

import { AmqpStreamClient } from '../../../src/index';
import { ISpaceBunnyParams } from '../../../src/spacebunny';

dotenv.config();
const args = minimist(process.argv.slice(2));
(async () => {
  try {
    // callback called when a message is received
    const messageCallback = (content) => {
      console.log(content); // eslint-disable-line no-console
    };

    const tls = (args.tls !== 'false');
    let connectionParams: ISpaceBunnyParams = { tls, autoReconnect: false, heartbeat: 10, connectionTimeout: 5000 };
    const client = args.client || process.env.CLIENT;
    const secret = args.secret || process.env.SECRET;

    // Auto Config
    // You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io
    connectionParams = {
      ...connectionParams,
      client,
      secret,
    };

    const host = args.host || process.env.HOST;
    const vhost = args.vhost || process.env.VHOST;
    const port = parseInt(process.env.PORT, 10) || 5671; // default for AMQPs
    if (host !== undefined && vhost !== undefined && port !== undefined) {
      // You can also provide full manual configuration
      connectionParams = {
        ...connectionParams,
        host,
        port,
        vhost,
      };
    }

    // Auto Config with tls
    // You can also provide the endpointUrl to use a different end point, default is http://api.demo.spacebunny.io
    // const connectionParams = {
    //   client: 'your-client-id',
    //   secret: 'your-secret',
    //   tls: true,
    //   ca: '/path/to/ca_certificate.pem',
    //   cert: '/path/to/client_certificate.pem',
    //   key: '/path/to/client_key.pem'
    // };

    // Manual Config
    // const connectionParams = {
    //   client: 'your-client-id',
    //   secret: 'your-secret',
    //   host: 'host',
    //   port: 61613, // default for MQTT
    //   vhost: 'vhost'
    // };

    // Stream hooks contains the stream name from which you want to collect data
    // and the callback which is invoked when receiving a message on that stream
    // the boolean cache option can be passed to specify the stream connection mode.
    //
    // Options:
    // stream: represents the stream name
    // cache: (default true)
    //    true (or missing) means that you want to read messages from the stream cache
    //    false means that you want to read messages in a temporary queue that will be delete on disconnect

    // const streams = ['data', 'alarms'];
    const stream = (args.stream || process.env.STREAM || '').split(' ');
    const streams = Array.isArray(stream) ? stream : [stream];
    const streamHooks = [];
    for (let index = 0; index < streams.length; index += 1) {
      const streamName = streams[index];
      streamHooks.push({ stream: streamName, callback: messageCallback, cache: false });
    }

    // Let's instantiate a Space Bunny AMQP client, providing the Device-Key, that's the fastest and simplest method
    // to create a new client.
    const streamClient = new AmqpStreamClient(connectionParams);
    process.once('SIGINT', () => {
      streamClient.disconnect().then((res) => {
        console.log('Bye Bye.'); // eslint-disable-line no-console
        const status = (res === true) ? 0 : 1;
        process.exit(status);
        // eslint-disable-next-line no-console
      }).catch((error) => { console.error(error); });
    });

    // Bind log event
    // eslint-disable-next-line no-console
    streamClient.on('log', (level, message, meta) => { console.log(message, ...meta); });

    await streamClient.connect();

    // Attach multiple hooks
    await streamClient.streamFrom(streamHooks);

    // Custome stream hook, connect directly to a device channel
    await streamClient.streamFrom({
      deviceId: args.deviceId || process.env.DEVICE_ID,
      channel: args.channel || process.env.CHANNEL,
      callback: messageCallback,
    });

    // Attach single hooks
    // const tag1 = await streamClient.addStreamHook(streamHooks[0]);
    // const tag2 = await streamClient.addStreamHook(streamHooks[1]);
    console.log('Waiting for streamed messages..'); // eslint-disable-line no-console

    // Unsubscribe
    // setTimeout(() => { streamClient.unsubscribe(tag1); }, 2000);
    // setTimeout(() => { streamClient.unsubscribe(tag2); }, 5000);
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
  }
})();
