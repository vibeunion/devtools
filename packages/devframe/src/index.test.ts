import { describe, expect, test } from 'bun:test';
import { DEVTOOLS_CHANNEL, installDevtoolsPageBridge, installPageScriptBridge } from './index.js';

type TestProtocol = {
  functions: {
    pageScript: {
      ping: () => string;
    };
  };
};

type TestBridge = {
  dispose: () => void;
  ping: () => string;
};

function withFakeWindow(run: (win: Record<string, unknown>) => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const win: Record<string, unknown> = {
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { origin: 'http://localhost' },
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: win });
  try {
    run(win);
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

function installTestBridge(disposed: number[]): TestBridge | null {
  return installPageScriptBridge<TestProtocol, TestBridge>({
    development: true,
    channelName: 'test:devtools',
    globalKey: '__TEST_DEVTOOLS__',
    functions: {
      ping: { type: 'query', handler: () => 'pong' },
    },
    buildBridge: ({ dispose }) => {
      let done = false;
      return {
        dispose: () => {
          if (done) return;
          done = true;
          disposed.push(1);
          dispose();
        },
        ping: () => 'pong',
      };
    },
  });
}

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
    withFakeWindow(() => {
      for (const development of [undefined, false]) {
        expect(installDevtoolsPageBridge({
          development,
          getSnapshot: () => { throw new Error('must not read'); },
          cacheAction: async () => { throw new Error('must not write'); },
        })).toBeNull();
      }
    });
  });

  test('installs at a custom global, replaces the previous bridge, and removes the global on dispose', () => {
    withFakeWindow((win) => {
      const disposed: number[] = [];
      const first = installTestBridge(disposed);
      expect(first).not.toBeNull();
      expect(win.__TEST_DEVTOOLS__).toBe(first);

      const second = installTestBridge(disposed);
      expect(disposed).toEqual([1]);
      expect(win.__TEST_DEVTOOLS__).toBe(second);

      // Disposing the stale bridge must not remove the current global.
      first!.dispose();
      expect(disposed).toEqual([1]);
      expect(win.__TEST_DEVTOOLS__).toBe(second);

      second!.dispose();
      expect(disposed).toEqual([1, 1]);
      expect('__TEST_DEVTOOLS__' in win).toBe(false);
    });
  });
});