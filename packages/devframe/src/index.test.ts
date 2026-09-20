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
});
