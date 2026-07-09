import {ThreadMessagePort, ThreadFunctionsManualMemoryManagement, retain} from '@quilted/threads';
import type {RemoteConnection} from '@remote-dom/core/elements';
import type {
    AddonDataEnvelope,
    AddonModuleExports,
    GhostBridge,
    HostCapabilities,
    SandboxExports
} from '../types.ts';

/**
 * The sandbox bootstrap. Ghost authors and serves this code — it is
 * version-locked to the host, never to add-on providers. It runs inside a
 * hidden `<iframe sandbox="allow-scripts">` (opaque origin) and is delivered
 * by the host over postMessage, so it never touches provider infrastructure.
 *
 * Responsibilities: fetch + integrity-check + evaluate add-on bundles, build
 * the `ghost` bridge over host capabilities, and mirror the add-on's `gh-*`
 * tree to the host via a RemoteMutationObserver.
 */

interface BootstrapInit {
    port: MessagePort;
}

const MODULE_GLOBAL = '__ghostAddonModule';

async function verifyIntegrity(source: string, integrity: string): Promise<void> {
    const match = /^sha256-(.+)$/.exec(integrity);
    if (!match) {
        throw new Error(`Unsupported integrity format: ${integrity}`);
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
    const actual = btoa(String.fromCharCode(...new Uint8Array(digest)));
    if (actual !== match[1]) {
        throw new Error('Add-on bundle failed integrity verification');
    }
}

function bootstrap({port}: BootstrapInit): void {
    const modules = new Map<string, AddonModuleExports>();
    const dataListeners = new Set<(data: AddonDataEnvelope) => void>();
    let currentData: AddonDataEnvelope | undefined;
    let rendered = false;

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
                show: (message, options) => capabilities.showToast(message, options)
            },
            navigate: path => capabilities.navigate(path),
            fetch: async (url, init) => {
                const serialized = await capabilities.fetch({
                    url,
                    method: init?.method,
                    headers: init?.headers,
                    body: init?.body
                });
                return new Response(serialized.body, {
                    status: serialized.status,
                    statusText: serialized.statusText,
                    headers: serialized.headers
                });
            }
        };
    }

    function getModule(bundleUrl: string): AddonModuleExports {
        const moduleExports = modules.get(bundleUrl);
        if (!moduleExports) {
            throw new Error(`Add-on bundle has not been loaded: ${bundleUrl}`);
        }
        return moduleExports;
    }

    const sandboxExports: SandboxExports = {
        async loadBundle({url, integrity}) {
            if (modules.has(url)) {
                return;
            }
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch add-on bundle (${response.status}): ${url}`);
            }
            const source = await response.text();
            if (integrity) {
                await verifyIntegrity(source, integrity);
            }
            (0, eval)(source); // eslint-disable-line no-eval
            const globalScope = globalThis as Record<string, unknown>;
            const raw = globalScope[MODULE_GLOBAL];
            delete globalScope[MODULE_GLOBAL];
            // Bundlers emitting an IIFE unwrap a lone default export to the
            // bare function; accept both that and a {default} namespace.
            const moduleExports = (typeof raw === 'function' ? {default: raw} : raw) as AddonModuleExports | undefined;
            if (typeof moduleExports?.default !== 'function') {
                throw new Error('Add-on bundle must default-export a function');
            }
            modules.set(url, moduleExports);
        },

        async render({bundleUrl, connection, data, capabilities}) {
            if (rendered) {
                throw new Error('This sandbox has already rendered — one render per sandbox instance');
            }
            rendered = true;
            // The host keeps these callable for the lifetime of the sandbox.
            retain(connection);
            retain(capabilities);
            const moduleExports = getModule(bundleUrl);
            // The connection hook is registered by @tryghost/addon-kit/addon
            // inside the bundle, so the observer and the gh-* elements share
            // one @remote-dom/core copy (see components.ts).
            const connect = (globalThis as Record<string, unknown>).__ghostAddonConnect as
                ((connection: RemoteConnection, root: Node) => unknown) | undefined;
            if (typeof connect !== 'function') {
                throw new Error('Add-on bundle did not register the remote connection hook — entry modules must import @tryghost/addon-kit/addon');
            }
            connect(connection, document.body);
            await moduleExports.default(buildGhost(data, capabilities));
        },

        async shouldRender({bundleUrl, data, capabilities}) {
            retain(capabilities);
            const moduleExports = getModule(bundleUrl);
            const result = await moduleExports.default(buildGhost(data, capabilities));
            return Boolean(result);
        },

        async updateData(data) {
            currentData = data;
            for (const listener of dataListeners) {
                listener(data);
            }
        }
    };

    new ThreadMessagePort(port, {
        exports: sandboxExports,
        functions: new ThreadFunctionsManualMemoryManagement()
    });
    port.start();
}

(globalThis as Record<string, unknown>).__ghostAddonBootstrap = bootstrap;
