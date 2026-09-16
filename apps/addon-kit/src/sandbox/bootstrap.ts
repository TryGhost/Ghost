import { ThreadMessagePort, ThreadFunctionsManualMemoryManagement, retain } from '@quilted/threads';
import type { RemoteConnection } from '@remote-dom/core/elements';
import type {
  AddonDataEnvelope,
  AddonEditorContentModuleExports,
  AddonEditorSettingsModuleExports,
  AddonModuleExports,
  GhostBridge,
  HostCapabilities,
  SandboxExports,
} from '../types.ts';
import { renderEditorBlockModule } from './render-block.ts';
import { deserializeResponse } from './serialized-response.ts';
import { verifyBundleIntegrity } from '../integrity.ts';

/**
 * The sandbox bootstrap. Ghost authors and serves this code — it is
 * version-locked to the host, never to add-on providers. It runs inside a
 * hidden opaque-origin iframe for Admin surfaces, or in a CSP-constrained
 * Worker for static editor rendering. The host delivers it over postMessage,
 * so the bootstrap itself never touches provider infrastructure.
 *
 * Responsibilities: fetch + integrity-check + evaluate add-on bundles, build
 * the `ghost` bridge over host capabilities, and mirror the add-on's `gh-*`
 * tree to the host via a RemoteMutationObserver.
 */

interface BootstrapInit {
  port: MessagePort;
}

const MODULE_GLOBAL = '__ghostAddonModule';

function bootstrap({ port }: BootstrapInit): void {
  const modules = new Map<
    string,
    AddonModuleExports | AddonEditorContentModuleExports | AddonEditorSettingsModuleExports
  >();
  const dataListeners = new Set<(data: AddonDataEnvelope) => void>();
  let currentData: AddonDataEnvelope | undefined;
  let rendered = false;
  let settingsProps: Record<string, unknown> | undefined;
  const settingsPropsListeners = new Set<(props: Record<string, unknown>) => void>();

  function buildGhost(data: AddonDataEnvelope, capabilities: HostCapabilities): GhostBridge {
    currentData = data;
    return {
      get data() {
        return currentData!;
      },
      onDataChange(listener) {
        dataListeners.add(listener);
        return () => {
          dataListeners.delete(listener);
        };
      },
      toast: {
        show: (message, options) => capabilities.showToast(message, options),
      },
      navigate: (path) => capabilities.navigate(path),
      fetch: async (url, init) => {
        const serialized = await capabilities.fetch({
          url,
          method: init?.method,
          headers: init?.headers,
          body: init?.body,
        });
        return deserializeResponse(serialized);
      },
    };
  }

  function getModule(
    bundleUrl: string,
  ): AddonModuleExports | AddonEditorContentModuleExports | AddonEditorSettingsModuleExports {
    const moduleExports = modules.get(bundleUrl);
    if (!moduleExports) {
      throw new Error(`Add-on bundle has not been loaded: ${bundleUrl}`);
    }
    return moduleExports;
  }

  const sandboxExports: SandboxExports = {
    async loadBundle({ url, integrity, source: providedSource }) {
      if (modules.has(url)) {
        return;
      }
      let source = providedSource;
      if (source === undefined) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch add-on bundle (${response.status}): ${url}`);
        }
        source = await response.text();
      }
      if (integrity) {
        await verifyBundleIntegrity(source, integrity);
      }
      (0, eval)(source); // eslint-disable-line no-eval
      const globalScope = globalThis as Record<string, unknown>;
      const raw = globalScope[MODULE_GLOBAL];
      delete globalScope[MODULE_GLOBAL];
      // Bundlers emitting an IIFE unwrap a lone default export to the
      // bare function; accept both that and a {default} namespace.
      const moduleExports = (typeof raw === 'function' ? { default: raw } : raw) as
        | AddonModuleExports
        | AddonEditorContentModuleExports
        | AddonEditorSettingsModuleExports
        | undefined;
      if (typeof moduleExports?.default !== 'function') {
        throw new Error('Add-on bundle must default-export a function');
      }
      modules.set(url, moduleExports);
    },

    async render({ bundleUrl, connection, data, capabilities }) {
      if (rendered) {
        throw new Error('This sandbox has already rendered — one render per sandbox instance');
      }
      rendered = true;
      // The host keeps these callable for the lifetime of the sandbox.
      retain(connection);
      retain(capabilities);
      const moduleExports = getModule(bundleUrl) as AddonModuleExports;
      // The connection hook is registered by @tryghost/addon-kit/addon
      // inside the bundle, so the observer and the gh-* elements share
      // one @remote-dom/core copy (see components.ts).
      const connect = (globalThis as Record<string, unknown>).__ghostAddonConnect as
        | ((connection: RemoteConnection, root: Node) => unknown)
        | undefined;
      if (typeof connect !== 'function') {
        throw new Error(
          'Add-on bundle did not register the remote connection hook — entry modules must import @tryghost/addon-kit/addon',
        );
      }
      connect(connection, document.body);
      await moduleExports.default(buildGhost(data, capabilities));
    },

    async shouldRender({ bundleUrl, data, capabilities }) {
      retain(capabilities);
      const moduleExports = getModule(bundleUrl) as AddonModuleExports;
      const result = await moduleExports.default(buildGhost(data, capabilities));
      return Boolean(result);
    },

    async renderBlock({ bundleUrl, request }) {
      const moduleExports = getModule(bundleUrl) as AddonEditorContentModuleExports;
      return renderEditorBlockModule(moduleExports, request);
    },

    async renderSettings({ bundleUrl, connection, request, capabilities, proposePatch }) {
      if (rendered) {
        throw new Error('This sandbox has already rendered — one render per sandbox instance');
      }
      rendered = true;
      retain(connection);
      retain(proposePatch);
      retain(capabilities);
      settingsProps = structuredClone(request.props);
      const connect = (globalThis as Record<string, unknown>).__ghostAddonConnect as
        | ((remoteConnection: RemoteConnection, root: Node) => unknown)
        | undefined;
      if (typeof connect !== 'function') {
        throw new Error('Add-on settings bundle did not register the remote connection hook');
      }
      connect(connection, document.body);
      const moduleExports = getModule(bundleUrl) as AddonEditorSettingsModuleExports;
      await moduleExports.default({
        blockName: request.blockName,
        context: request.context ? structuredClone(request.context) : undefined,
        assets: {
          async uploadImage(image) {
            const asset = await capabilities.uploadImage(structuredClone(image));
            return structuredClone(asset);
          },
        },
        fetch: async (url, init) => {
          const serialized = await capabilities.fetch({
            url,
            method: init?.method,
            headers: init?.headers,
            body: init?.body,
          });
          return deserializeResponse(serialized);
        },
        get props() {
          return settingsProps!;
        },
        async proposePatch(patch) {
          if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
            throw new Error('Add-on settings patches must be objects');
          }
          await proposePatch(structuredClone(patch));
        },
        onPropsChange(listener) {
          settingsPropsListeners.add(listener);
          return () => settingsPropsListeners.delete(listener);
        },
      });
    },

    async updateSettingsProps(props) {
      settingsProps = structuredClone(props);
      for (const listener of settingsPropsListeners) {
        listener(settingsProps);
      }
    },

    async updateData(data) {
      currentData = data;
      for (const listener of dataListeners) {
        listener(data);
      }
    },
  };

  new ThreadMessagePort(port, {
    exports: sandboxExports,
    functions: new ThreadFunctionsManualMemoryManagement(),
  });
  port.start();
}

(globalThis as Record<string, unknown>).__ghostAddonBootstrap = bootstrap;
