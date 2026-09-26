import { createPageScriptChannel } from 'devframe/in-page-channel';
import type {
  CreatePageScriptChannelOptions,
  InPageChannelProtocol,
  PageScriptChannel,
} from 'devframe/in-page-channel';
import type {
  DevtoolsCacheActionRequest,
  DevtoolsCacheActionResult,
  DevtoolsCacheSelector,
} from '@vibeunion/devtools-protocol';

export const DEVTOOLS_CHANNEL = 'vibeunion:devtools';
export const DEVTOOLS_GLOBAL_KEY = '__VIBEUNION_DEVTOOLS__';

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

/**
 * Host surface handed to {@link InstallPageScriptBridgeOptions.buildBridge}.
 * The host composes the value that is published on the global while the
 * generic helper owns channel lifecycle and global registration.
 */
export type PageScriptBridgeHost<P extends InPageChannelProtocol> = {
  /** The live page-script channel, in case the host needs to fan out events. */
  channel: PageScriptChannel<P>;
  /** Throws once the bridge has been disposed. */
  assertActive: () => void;
  /** Closes the channel, marks the bridge disposed, and removes the global. */
  dispose: () => void;
};

export type InstallPageScriptBridgeOptions<
  P extends InPageChannelProtocol,
  TValue extends { dispose: () => void },
> = {
  /**
   * Hosts must opt in explicitly. The flag is an installation switch, not an
   * authorization boundary.
   */
  development?: boolean;
  channelName: string;
  /** Global property that receives the bridge value. */
  globalKey: string;
  functions: CreatePageScriptChannelOptions<P>['functions'];
  /** Builds the value exposed on the global. Called once per install. */
  buildBridge: (host: PageScriptBridgeHost<P>) => TValue;
};

/**
 * Installs a product-specific page-script bridge around a Devframe in-page
 * channel while sharing the transport lifecycle: SSR guard, explicit
 * development opt-in, dispose-on-reinstall, and global registration/removal.
 *
 * Product adapters keep their own protocol, channel name, and global key, so
 * this can be adopted without changing an existing wire contract.
 */
export function installPageScriptBridge<
  P extends InPageChannelProtocol = InPageChannelProtocol,
  TValue extends { dispose: () => void } = { dispose: () => void },
>(
  options: InstallPageScriptBridgeOptions<P, TValue>,
): TValue | null {
  if (typeof window === 'undefined' || options.development !== true) return null;

  const target = window as unknown as Record<string, unknown>;
  const previous = target[options.globalKey];
  if (previous && typeof (previous as { dispose?: unknown }).dispose === 'function') {
    (previous as { dispose: () => void }).dispose();
  }

  let disposed = false;
  const assertActive = () => {
    if (disposed) throw new Error('DevTools bridge has been disposed');
  };

  // Reject calls into any handler once the bridge has been torn down.
  const functions = Object.fromEntries(
    Object.entries(options.functions).map(([name, definition]) => {
      const handler = (definition as { handler: (...args: unknown[]) => unknown }).handler;
      return [name, {
        ...definition,
        handler: (...args: unknown[]) => {
          assertActive();
          return handler(...args);
        },
      }];
    }),
  ) as CreatePageScriptChannelOptions<P>['functions'];

  const channel = createPageScriptChannel<P>({
    name: options.channelName,
    functions,
  });

  let value: TValue;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    channel.close();
    if (target[options.globalKey] === value) {
      Reflect.deleteProperty(target, options.globalKey);
    }
  };

  value = options.buildBridge({ channel, assertActive, dispose });

  Object.defineProperty(window, options.globalKey, {
    configurable: true,
    enumerable: false,
    value,
    writable: false,
  });

  return value;
}

export function installDevtoolsPageBridge(
  options: PageBridgeOptions,
): DevtoolsPageBridge | null {
  return installPageScriptBridge<DevtoolsBridgeProtocol, DevtoolsPageBridge>({
    development: options.development,
    channelName: options.channelName ?? DEVTOOLS_CHANNEL,
    globalKey: DEVTOOLS_GLOBAL_KEY,
    functions: {
      getSnapshot: { type: 'query', handler: options.getSnapshot },
      cacheAction: { type: 'action', handler: options.cacheAction },
    },
    buildBridge: ({ dispose }) => ({
      dispose,
      getSnapshot: options.getSnapshot,
      cacheAction: (action, selector) => options.cacheAction({ action, selector }),
    }),
  });
}

declare global {
  interface Window {
    __VIBEUNION_DEVTOOLS__?: DevtoolsPageBridge;
  }
}