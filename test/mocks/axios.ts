import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import faker from 'faker';

const mock = new MockAdapter(axios);

export function apiCalls(method: string, api: string): number {
  const calls = mock.history[method].filter(call => call.url.endsWith(api));
  return calls.length;
}

export function resetMocks(): void {
  mock.reset();
}

export function mockDeviceConfigs(): void {
  mock.onGet('/device_configurations').reply(() => {
    return [200, {
      connection: {
        host: 'endpoint.spacebunny.io',
        protocols: {
          amqp: [],
          mqtt: [],
          stomp: [],
          webStomp: []
        },
        deviceName: faker.commerce.product(),
        deviceId: faker.random.alphaNumeric(24),
        secret: faker.random.uuid(),
        vhost: faker.random.alphaNumeric(24),
      },
      properties: {},
      channels: ['alarms', 'data'].map((n) => {
        return {
          id: faker.random.alphaNumeric(24),
          name: n,
          properties: {},
          createdAt: faker.time.recent().toISOString(),
          updatedAt: faker.time.recent().toISOString(),
          plugin: []
        };
      })
    }];
  });
}

export function mockBadDeviceConfigs(): void {
  mock.onGet('/device_configurations').reply(401);
}
