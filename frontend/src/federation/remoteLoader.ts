/**
 * Resilient remote loader for Konitys federated modules (Vite Module Federation).
 *
 * Key constraints for Next.js (webpack):
 * - Uses native import() via new Function() to bypass webpack transformation
 * - Shares host React/ReactDOM to avoid dual-instance hook crashes
 * - Timeout: 5s per attempt, 1 retry, auto-reconnect every 30s
 */

import React from 'react';
import ReactDOM from 'react-dom';

const DEFAULT_REMOTE_URL =
  process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://plateform.konitys.fr';
const REMOTE_ENTRY_PATH = '/assets/remoteEntry.js';
const LOAD_TIMEOUT_MS = 2000;
const MAX_RETRIES = 0;
const RECONNECT_INTERVAL_MS = 30000;

interface FederationContainer {
  init: (shareScope: Record<string, unknown>) => Promise<void>;
  get: (moduleName: string) => Promise<() => Promise<unknown>>;
}

let container: FederationContainer | null = null;
let loadFailed = false;
let reconnectTimer: ReturnType<typeof setInterval> | null = null;
let onReconnect: (() => void) | null = null;

/**
 * Native dynamic import that bypasses webpack bundling.
 * webpack transforms import() into __webpack_require__() which cannot
 * load cross-origin ES modules. new Function() creates a real import().
 */
// eslint-disable-next-line no-new-func
const nativeImport = new Function('url', 'return import(url)') as (
  url: string
) => Promise<FederationContainer>;

function importWithTimeout(
  url: string,
  timeoutMs: number
): Promise<FederationContainer> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout loading ${url} after ${timeoutMs}ms`));
    }, timeoutMs);

    nativeImport(url)
      .then((mod) => {
        clearTimeout(timer);
        resolve(mod);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function initContainer(): Promise<FederationContainer> {
  if (container) return container;

  const entryUrl = `${DEFAULT_REMOTE_URL}${REMOTE_ENTRY_PATH}`;
  const remoteModule = await importWithTimeout(entryUrl, LOAD_TIMEOUT_MS);

  if (!remoteModule || !remoteModule.get || !remoteModule.init) {
    throw new Error('Remote module does not export get/init');
  }

  container = remoteModule;

  // Share host React/ReactDOM to avoid dual-instance hook crashes.
  // Vite federation shareScope format.
  const shareScope = {
    react: {
      [React.version]: {
        get: () => Promise.resolve(() => React),
      },
    },
    'react-dom': {
      [ReactDOM.version]: {
        get: () => Promise.resolve(() => ReactDOM),
      },
    },
  };
  await container.init(shareScope);

  return container;
}

function startReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setInterval(async () => {
    try {
      container = null;
      await initContainer();
      loadFailed = false;
      clearInterval(reconnectTimer!);
      reconnectTimer = null;
      console.info('[Konitys Federation] Hub reconnected');
      if (onReconnect) onReconnect();
    } catch {
      // Still down, keep polling
    }
  }, RECONNECT_INTERVAL_MS);
}

export function setReconnectCallback(cb: (() => void) | null): void {
  onReconnect = cb;
}

async function loadRemoteModuleWithRetry(
  moduleName: string
): Promise<Record<string, unknown> | null> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const c = await initContainer();
      const factory = await c.get(moduleName);
      const mod = (await factory()) as Record<string, unknown>;
      loadFailed = false;
      return mod;
    } catch (err) {
      lastError = err as Error;
      console.warn(
        `[Konitys Federation] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed for ${moduleName}:`,
        (err as Error).message
      );
      container = null;
    }
  }
  loadFailed = true;
  console.error(
    `[Konitys Federation] Failed to load ${moduleName} after ${MAX_RETRIES + 1} attempts.`,
    lastError
  );
  startReconnect();
  return null;
}

/**
 * Load a federated component for use with React.lazy().
 *
 * Vite federation factory returns the component directly (not { default: Component }),
 * so we wrap it for React.lazy() compatibility.
 *
 * Usage:
 *   const RemoteHeader = lazy(() => loadRemoteComponent('./HeaderBar', FallbackHeaderBar));
 */
export async function loadRemoteComponent(
  moduleName: string,
  FallbackComponent?: React.ComponentType<Record<string, unknown>>
): Promise<{ default: React.ComponentType<Record<string, unknown>> }> {
  const mod = await loadRemoteModuleWithRetry(moduleName);
  if (mod) {
    const component = (mod.default || mod) as React.ComponentType<Record<string, unknown>>;
    return { default: component };
  }
  if (FallbackComponent) {
    return { default: FallbackComponent };
  }
  return { default: () => null };
}

export function isFederationFailed(): boolean {
  return loadFailed;
}
