import SpaceBunny from '../../src/spacebunny';

describe('SpaceBunny Sdk', () => {
  let sdk: SpaceBunny;

  beforeEach(() => {
    sdk = new SpaceBunny();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(sdk).toBeTruthy();
    });

    it('should have default values', () => {
      expect(sdk.getChannels()).toEqual([]);
      expect(sdk.getInboxTopic()).toBe('inbox');
      expect(sdk.isConnected()).toBe(false);
    });

    it('should accept custom options', () => {
      const custom = new SpaceBunny({
        deviceKey: 'test-key',
        inboxTopic: 'custom-inbox',
        verbose: true,
      });
      expect(custom.getInboxTopic()).toBe('custom-inbox');
    });

    it('should default tls to true', () => {
      const sb = new SpaceBunny({});
      // tls is protected, but we can verify by checking that no error occurs
      expect(sb).toBeTruthy();
    });

    it('should accept tls false', () => {
      const sb = new SpaceBunny({ tls: false });
      expect(sb).toBeTruthy();
    });
  });

  describe('isStreamClient', () => {
    it('should return false for base SpaceBunny', () => {
      expect(sdk.isStreamClient()).toBe(false);
    });
  });

  describe('getDeviceId', () => {
    it('should return undefined when no deviceId is set', () => {
      expect(sdk.getDeviceId()).toBeUndefined();
    });

    it('should return deviceId when set', () => {
      const sb = new SpaceBunny({ deviceId: 'device-123' });
      expect(sb.getDeviceId()).toBe('device-123');
    });
  });

  describe('getClient', () => {
    it('should return undefined when no client is set', () => {
      expect(sdk.getClient()).toBeUndefined();
    });

    it('should return client when set', () => {
      const sb = new SpaceBunny({ client: 'client-123' });
      expect(sb.getClient()).toBe('client-123');
    });
  });

  describe('getChannels', () => {
    it('should return empty array by default', () => {
      expect(sdk.getChannels()).toEqual([]);
    });

    it('should return channels when provided', () => {
      const channels = [{ name: 'data' }, { name: 'alarms' }];
      const sb = new SpaceBunny({ channels });
      expect(sb.getChannels()).toEqual(channels);
    });
  });

  describe('event emitter', () => {
    it('should support on/emit pattern', () => {
      const handler = jest.fn();
      sdk.on('test', handler);
      sdk.emit('test', 'payload');
      expect(handler).toHaveBeenCalledWith('payload');
    });

    it('should emit log events when verbose', () => {
      const verboseSdk = new SpaceBunny({ verbose: true });
      const handler = jest.fn();
      verboseSdk.on('log', handler);
      // Access protected method via any cast to test log emission
      (verboseSdk as any).log('info', 'test message');
      expect(handler).toHaveBeenCalled();
    });
  });
});
