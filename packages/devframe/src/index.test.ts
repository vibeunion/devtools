import { describe, expect, test } from 'bun:test';
import { DEVTOOLS_CHANNEL, installDevtoolsPageBridge } from './index.js';

describe('devframe integration', () => {
  test('uses the shared channel name', () => {
    expect(DEVTOOLS_CHANNEL).toBe('vibeunion:devtools');
  });

  test('does not install a browser bridge during SSR', () => {
    expect(installDevtoolsPageBridge({
      getSnapshot: () => null,
      cacheAction: async () => ({ action: 'clear', matched: 0, changed: 0 }),
    })).toBeNull();
  });

  test('requires an explicit development opt-in even with a window', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
    try {
      for (const development of [undefined, false]) {
        expect(installDevtoolsPageBridge({
          development,
          getSnapshot: () => { throw new Error('must not read'); },
          cacheAction: async () => { throw new Error('must not write'); },
        })).toBeNull();
      }
    } finally {
      if (original) Object.defineProperty(globalThis, 'window', original);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });
});
