import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { faker } from '@faker-js/faker';

const mock = new MockAdapter(axios);

export function apiCalls(method: string, api: string): number {
  const calls = (mock.history as Record<string, any[]>)[method].filter((call: any) => call.url.endsWith(api));
  return calls.length;
}

export function resetMocks(): void {
  mock.reset();
}

export function mockDeviceConfigs(): void {
  mock.onGet('/device_configurations').reply(() => {
    return [
      200,
      {
        connection: {
          host: 'endpoint.spacebunny.io',
          protocols: {
            amqp: [],
            mqtt: [],
            stomp: [],
            webStomp: [],
          },
          deviceName: faker.commerce.product(),
          deviceId: faker.string.alphanumeric(24),
          secret: faker.string.uuid(),
          vhost: faker.string.alphanumeric(24),
        },
        properties: {},
        channels: ['alarms', 'data'].map((n) => {
          return {
            id: faker.string.alphanumeric(24),
            name: n,
            properties: {},
            createdAt: faker.date.recent().toISOString(),
            updatedAt: faker.date.recent().toISOString(),
            plugin: [],
          };
        }),
      },
    ];
  });
}

export function mockBadDeviceConfigs(): void {
  mock.onGet('/device_configurations').reply(401);
}
