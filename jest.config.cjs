module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
  },
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/website/', '/.aws-sam/'],
  moduleNameMapper: {
    '^logger$': '<rootDir>/layers/common/src/logger/index.ts',
    '^env-config$': '<rootDir>/layers/common/src/config/index.ts',
    '^workspace-auth$': '<rootDir>/layers/common/src/workspace-auth/index.ts',
    '^dynamo-utils$': '<rootDir>/layers/common/src/dynamo-utils/index.ts',
    // Handler folders and layers/common/ each get their own independent `npm install`
    // (see CLAUDE.md), so '@aws-sdk/lib-dynamodb'/'@aws-sdk/client-dynamodb' resolve to
    // physically distinct copies per folder. aws-sdk-client-mock's `.on(Command)` matches
    // via `instanceof`, so a Command built inside a layer module (e.g. dynamo-utils'
    // queryAll) against its own copy never matches a `ddbMock.on(QueryCommand)` registered
    // from a handler test file's copy — the mock silently no-ops instead of erroring. Pin
    // both packages to one physical copy for tests only; this doesn't affect `sam build`,
    // which bundles each function from its own folder's node_modules independently.
    '^@aws-sdk/lib-dynamodb$': '<rootDir>/layers/common/node_modules/@aws-sdk/lib-dynamodb',
    '^@aws-sdk/client-dynamodb$': '<rootDir>/layers/common/node_modules/@aws-sdk/client-dynamodb',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFiles: ['<rootDir>/jest.setup.cjs'],
};
