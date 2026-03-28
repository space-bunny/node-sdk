import dotenv from 'dotenv';
import minimist from 'minimist';
import { StompClient } from '../../../src/indexNode';
import { ISpaceBunnyParams } from '../../../src/spacebunny';

dotenv.config();
const args = minimist(process.argv.slice(2));

(async () => {
  const deviceKey = args.deviceKey || args['device-key'] || process.env.DEVICE_KEY;
  const tls = args.tls !== 'false';
  const channel = args.channel || 'data';

  let connectionParams: ISpaceBunnyParams = { tls, autoReconnect: false, heartbeat: 10, connectionTimeout: 5000 };

  if (deviceKey) {
    connectionParams = { ...connectionParams, deviceKey };
  } else {
    connectionParams = {
      ...connectionParams,
      deviceId: process.env.DEVICE_ID,
      secret: process.env.SECRET,
      host: process.env.HOST,
      port: parseInt(process.env.PORT || '15673', 10),
      vhost: process.env.VHOST,
    };
  }

  const client = new StompClient(connectionParams);

  process.once('SIGINT', async () => {
    await client.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  });

  await client.connect();

  // Publish one message per second for 60 seconds
  for (let n = 0; n < 60; n += 1) {
    const content = { some: 'json', index: n + 1 };
    try {
      await client.publish(channel, content);
      console.log(`Published message ${n + 1} on channel '${channel}'`);
    } catch (error) {
      console.error('Publish error:', error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await client.disconnect();
})();
