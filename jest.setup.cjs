process.env.TABLE_NAME = 'test-table';
process.env.USER_POOL_ID = 'test-user-pool';
// Chat handler's local config (handlers/chat/config.ts) resolves these eagerly
// at module load via requireEnv, same as env-config's `config` above. ES module
// imports always evaluate before the importing file's own top-level statements,
// so setting these inline in a test file (after the `import './auth.js'` line,
// even though textually before it) runs too late. setupFiles run before any
// test module is loaded, so they need to live here instead.
process.env.COGNITO_USER_POOL_ID = 'us-east-1_test';
process.env.COGNITO_CLIENT_ID = 'test-client';
process.env.AWS_REGION = 'us-east-1';

// `awslambda` is injected by the Lambda runtime, not by any package, so it does
// not exist under Jest. handlers/chat/index.ts calls streamifyResponse at module
// load to build its `handler` export, which would throw before any test runs —
// even though the tests only exercise the injectable `runChat`. Stub it here.
globalThis.awslambda = {
  streamifyResponse: (fn) => fn,
  HttpResponseStream: { from: (stream) => stream },
};
