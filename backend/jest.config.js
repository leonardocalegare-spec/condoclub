/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/../tests/backend'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  forceExit: true,
  modulePaths: ['<rootDir>/node_modules'],
};
