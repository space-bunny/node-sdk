module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['./test/testHelper.ts'],
  resetMocks: true
};
