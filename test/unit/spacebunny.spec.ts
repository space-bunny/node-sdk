import SpaceBunny from '../../src/spacebunny';

describe('SpaceBunny Sdk', () => {
  let sdk: SpaceBunny;
  beforeEach(() => {
    sdk = new SpaceBunny();
  });

  describe('constructor', () => {

    it('should call loadCachedMessages', () => {
      expect(sdk.loadCachedMessages).'toBeTruthy();
    });
  });
});
