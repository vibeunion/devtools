import { createPageScriptChannel } from 'devframe/in-page-channel';
import type {
  DevtoolsCacheActionRequest,
  DevtoolsCacheActionResult,
  DevtoolsCacheSelector,
} from '@vibeunion/devtools-protocol';

export const DEVTOOLS_CHANNEL = 'vibeunion:devtools';

export type DevtoolsBridgeProtocol = {
  functions: {
    pageScript: {
      getSnapshot: () => unknown;
      cacheAction: (
        request: DevtoolsCacheActionRequest,
      ) => Promise<DevtoolsCacheActionResult>;
    };
  };
};

export type DevtoolsPageBridge = {
  getSnapshot: () => unknown;
  cacheAction: (
    action: DevtoolsCacheActionRequest['action'],
    selector?: DevtoolsCacheSelector,
  ) => Promise<DevtoolsCacheActionResult>;
};

export type PageBridgeOptions = {
  channelName?: string;
  getSnapshot: () => unknown;
  cacheAction: (
    request: DevtoolsCacheActionRequest,
  ) => Promise<DevtoolsCacheActionResult>;
};

export function installDevtoolsPageBridge(
  options: PageBridgeOptions,
): DevtoolsPageBridge | null {
  const meta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  if (typeof window === 'undefined' || meta.env?.DEV === false) return null;

  const channel = createPageScriptChannel<DevtoolsBridgeProtocol>({
    name: options.channelName ?? DEVTOOLS_CHANNEL,
    functions: {
      getSnapshot: { type: 'query', handler: options.getSnapshot },
      cacheAction: { type: 'action', handler: options.cacheAction },
    },
  });

  const bridge: DevtoolsPageBridge = {
    getSnapshot: options.getSnapshot,
    cacheAction: (action, selector) => options.cacheAction({ action, selector }),
  };

  Object.defineProperty(window, '__VIBEUNION_DEVTOOLS__', {
    configurable: true,
    enumerable: false,
    value: bridge,
    writable: false,
  });

  return bridge;
}

declare global {
  interface Window {
    __VIBEUNION_DEVTOOLS__?: DevtoolsPageBridge;
  }
}
