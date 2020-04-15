import FbxSdk, { Communication, Configs, Logger } from '../../src';

describe('FbxSdk', () => {
  describe('init', () => {
    beforeEach(async () => {
      await FbxSdk.init();
    });

    afterEach(() => {
      Configs.destroy();
      Logger.destroy();
      Communication.destroy();
      FbxSdk.destroy();
    });
    it('should get info from manifest', () => {
      const { name, firmwareVersion } = FbxSdk.configs.app;
      expect(name).toEqual('fbx-sdk-mock');
      expect(firmwareVersion).toEqual('1.1.1');
    });

    it('should initialize log level from configs', () => {
      expect(FbxSdk.logger.getLogLevel()).toEqual('silly');
    });
  });

  describe('start', () => {
    it('should be false', () => {
      expect(false).toBeFalsy();
    });
  });

  describe('stop', () => {
    it('should be false', () => {
      expect(false).toBeFalsy();
    });
  });
});
