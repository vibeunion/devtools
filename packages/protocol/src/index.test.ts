import { describe, expect, test } from 'bun:test';
import { createDevtoolsSnapshot, redactDevtoolsRecord } from './index.js';
import type { SvadminDevtoolsSnapshot } from './index.js';

test('svadmin snapshot type stays JSON-safe and versioned', () => {
  const snapshot: SvadminDevtoolsSnapshot = {
    version: 1,
    environment: 'development',
    route: '/posts',
    locale: 'en',
    theme: 'system',
    colorTheme: 'neutral',
    resourceCount: 0,
    providers: [],
    cache: {
      queries: { total: 0, fetching: 0, stale: 0, errors: 0 },
      mutations: { total: 0, pending: 0, paused: 0, errors: 0 },
    },
    queries: [],
  };
  expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
});

describe('devtools contract', () => {
  test('redacts key and token spelling variants without hiding trace IDs', () => {
    for (const key of ['apiKey', 'api_key', 'privateKey', 'private_key', 'jwt', 'accessToken', 'refreshToken']) {
      expect(redactDevtoolsRecord({ [key]: 'sensitive', traceId: 'trace-1' }))
        .toEqual({ [key]: '[redacted]', traceId: 'trace-1' });
    }
  });

  test('redacts secrets recursively', () => {
    expect(redactDevtoolsRecord({
      requestId: 'req-1',
      authorization: 'Bearer secret',
      nested: { service_role_key: 'private' },
    })).toEqual({
      requestId: 'req-1',
      authorization: '[redacted]',
      nested: { service_role_key: '[redacted]' },
    });
  });

  test('creates versioned snapshots without changing trace identity', () => {
    expect(createDevtoolsSnapshot({
      source: 'supacloud',
      requestId: 'req-1',
      traceId: 'trace-1',
      correlationId: 'workflow-1',
      diagnostics: [],
      events: [],
    })).toMatchObject({
      version: 1,
      source: 'supacloud',
      requestId: 'req-1',
      traceId: 'trace-1',
      correlationId: 'workflow-1',
    });
  });
});
