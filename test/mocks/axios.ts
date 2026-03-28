import { faker } from '@faker-js/faker';

const mockResponses: Map<string, { status: number; body: unknown }> = new Map();

export function resetMocks(): void {
  mockResponses.clear();
  global.fetch = jest.fn();
}

export function mockDeviceConfigs(): void {
  const responseBody = {
    connection: {
      host: 'endpoint.spacebunny.io',
      protocols: {
        amqp: [],
        mqtt: [],
        stomp: [],
        web_stomp: [],
      },
      device_name: faker.commerce.product(),
      device_id: faker.string.alphanumeric(24),
      secret: faker.string.uuid(),
      vhost: faker.string.alphanumeric(24),
    },
    properties: {},
    channels: ['alarms', 'data'].map((n) => {
      return {
        id: faker.string.alphanumeric(24),
        name: n,
        properties: {},
        created_at: faker.date.recent().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        plugin: [],
      };
    }),
  };

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(responseBody),
  });
}

export function mockBadDeviceConfigs(): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    json: () => Promise.resolve({}),
  });
}
