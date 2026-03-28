import dotenv from 'dotenv';
import minimist from 'minimist';
import { StompStreamClient } from '../../../src/indexNode';
import { ISpaceBunnyParams } from '../../../src/spacebunny';

dotenv.config();
const args = minimist(process.argv.slice(2));

(async () => {
  const tls = args.tls !== 'false';
  const client = args.client || process.env.CLIENT;
  const secret = args.secret || process.env.SECRET;

  let connectionParams: ISpaceBunnyParams = {
    tls,
    autoReconnect: false,
    heartbeat: 10,
    connectionTimeout: 5000,
    client,
    secret,
  };

  // Optional: manual host/port/vhost configuration
  const host = args.host || process.env.HOST;
  const vhost = args.vhost || process.env.VHOST;
  if (host && vhost) {
    connectionParams = {
      ...connectionParams,
      host,
      port: parseInt(process.env.PORT || '15673', 10),
      vhost,
    };
  }

  const streamClient = new StompStreamClient(connectionParams);

  process.once('SIGINT', async () => {
    await streamClient.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  });

  await streamClient.connect();

  // Build stream hooks from --stream arguments
  // Usage: --stream=data --stream=alarms
  const streamArg = args.stream || process.env.STREAM || '';
  const streams = Array.isArray(streamArg) ? streamArg : streamArg.split(' ').filter(Boolean);

  const streamHooks = streams.map((name: string) => ({
    stream: name,
    callback: (stompMessage: unknown) => {
      console.log(`[${name}]`, stompMessage);
    },
  }));

  if (streamHooks.length > 0) {
    await streamClient.streamFrom(streamHooks);
  }

  console.log('Waiting for streamed messages...');
})();
