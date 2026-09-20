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
  dispose: () => void;
  getSnapshot: () => unknown;
  cacheAction: (
    action: DevtoolsCacheActionRequest['action'],
    selector?: DevtoolsCacheSelector,
  ) => Promise<DevtoolsCacheActionResult>;
};

export type PageBridgeOptions = {
  /** 必须由宿主显式传入开发模式标记；默认不启用。 */
  development?: boolean;
  channelName?: string;
  getSnapshot: () => unknown;
  cacheAction: (
    request: DevtoolsCacheActionRequest,
  ) => Promise<DevtoolsCacheActionResult>;
};

export function installDevtoolsPageBridge(
  options: PageBridgeOptions,
): DevtoolsPageBridge | null {
  if (typeof window === 'undefined' || options.development !== true) return null;

  window.__VIBEUNION_DEVTOOLS__?.dispose();
  let disposed = false;
  const assertActive = () => {
    if (disposed) throw new Error('DevTools bridge has been disposed');
  };
  const getSnapshot = () => {
    assertActive();
    return options.getSnapshot();
  };
  const cacheAction = async (request: DevtoolsCacheActionRequest) => {
    assertActive();
    return options.cacheAction(request);
  };

  const channel = createPageScriptChannel<DevtoolsBridgeProtocol>({
    name: options.channelName ?? DEVTOOLS_CHANNEL,
    functions: {
      getSnapshot: { type: 'query', handler: getSnapshot },
      cacheAction: { type: 'action', handler: cacheAction },
    },
  });

  const bridge: DevtoolsPageBridge = {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      channel.close();
      if (window.__VIBEUNION_DEVTOOLS__ === bridge) {
        delete window.__VIBEUNION_DEVTOOLS__;
      }
    },
    getSnapshot,
    cacheAction: (action, selector) => cacheAction({ action, selector }),
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
