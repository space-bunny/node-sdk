import dotenv from 'dotenv';
import minimist from 'minimist';
import { MqttClient } from '../../../src/indexNode';
import { ISpaceBunnyParams } from '../../../src/spacebunny';

dotenv.config();
const args = minimist(process.argv.slice(2));

(async () => {
  const deviceKey = args.deviceKey || args['device-key'] || process.env.DEVICE_KEY;
  const tls = args.tls !== 'false';

  let connectionParams: ISpaceBunnyParams = { tls, heartbeat: 10, connectionTimeout: 5000 };

  if (deviceKey) {
    connectionParams = { ...connectionParams, deviceKey };
  } else {
    connectionParams = {
      ...connectionParams,
      deviceId: process.env.DEVICE_ID,
      secret: process.env.SECRET,
      host: process.env.HOST,
      port: parseInt(process.env.PORT || '8883', 10),
      vhost: process.env.VHOST,
    };
  }

  const client = new MqttClient(connectionParams);

  process.once('SIGINT', async () => {
    await client.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  });

  client.on('log', (log) => console.log(log.message));

  await client.connect();

  // Subscribe to inbox messages
  await client.onMessage((topic, message) => {
    console.log(`Received on ${topic}:`, message);
  });

  console.log('Waiting for messages on inbox...');
})();
