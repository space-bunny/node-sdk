module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['./test/testHelper.ts'],
  resetMocks: true,
  transformIgnorePatterns: ['node_modules/(?!(@faker-js/faker)/)'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': ['ts-jest', { useESM: false }],
  },
};
