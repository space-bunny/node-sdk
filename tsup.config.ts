import { defineConfig } from 'tsup';

export default defineConfig([
  // Node.js CJS bundle (all deps external)
  {
    entry: { spacebunny: 'src/indexNode.ts' },
    format: ['cjs'],
    target: 'node18',
    platform: 'node',
    outDir: 'lib',
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['amqplib', 'mqtt', '@stomp/stompjs', 'axios', 'humps', 'url-join', 'bufferutil', 'utf-8-validate'],
  },
  // Browser CJS bundle (STOMP only, deps bundled)
  {
    entry: { 'spacebunny.web': 'src/indexWeb.ts' },
    format: ['cjs'],
    target: 'es2020',
    platform: 'node',
    outDir: 'lib',
    dts: false,
    sourcemap: true,
    clean: false,
    external: ['@stomp/stompjs'],
  },
  // Browser UMD-like bundle (for <script> tags)
  {
    entry: { 'spacebunny.var': 'src/indexWeb.ts' },
    format: ['cjs'],
    target: 'es2020',
    platform: 'node',
    outDir: 'lib',
    dts: false,
    sourcemap: true,
    clean: false,
    external: ['@stomp/stompjs'],
    footer: {
      js: 'if(typeof window!=="undefined"){Object.assign(window,module.exports);}',
    },
  },
]);
