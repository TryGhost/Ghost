import bootstrapSource from '@tryghost/addon-kit/bootstrap';
import {ThreadMessagePort, ThreadFunctionsManualMemoryManagement} from '@quilted/threads';
import {createSandboxSrcdoc} from './shim.ts';
import {verifyBundleIntegrity} from '../integrity.ts';
import type {SandboxExports} from '../types.ts';

/**
 * Owns one sandbox instance: a hidden `<iframe sandbox="allow-scripts">`
 * (opaque origin — browser-enforced isolation from the admin origin, no
 * cookies, no storage, no ambient credentials) plus the RPC thread into it.
 *
 * One controller = one surface instance. Interactive Admin targets render
 * into the iframe's hidden document and mirror it to the host. Static editor
 * targets run in a Worker created by the opaque frame, with no navigable DOM.
 */
export class AddonSandboxController {
    private iframe: HTMLIFrameElement | null = null;
    private port: MessagePort | null = null;
    private sandbox: import('@quilted/threads').ThreadImports<SandboxExports> | null = null;
    private destroyed = false;
    private staticExecution = false;

    async start({staticExecution = false}: {staticExecution?: boolean} = {}): Promise<void> {
        if (this.iframe) {
            throw new Error('Sandbox already started');
        }

        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.title = 'Ghost add-on sandbox';
        iframe.style.display = 'none';
        this.staticExecution = staticExecution;
        iframe.srcdoc = createSandboxSrcdoc({staticExecution});
        this.iframe = iframe;

        const loaded = new Promise<void>((resolvePromise, rejectPromise) => {
            iframe.addEventListener('load', () => resolvePromise(), {once: true});
            iframe.addEventListener('error', () => rejectPromise(new Error('Add-on sandbox failed to load')), {once: true});
        });

        document.body.appendChild(iframe);
        await loaded;

        if (this.destroyed || !iframe.contentWindow) {
            throw new Error('Add-on sandbox was destroyed during startup');
        }

        const channel = new MessageChannel();
        let removeStaticStartupListener = () => {};
        const staticStartup = staticExecution ? new Promise<void>((resolvePromise, rejectPromise) => {
            const timeout = window.setTimeout(() => {
                removeStaticStartupListener();
                rejectPromise(new Error('Static add-on Worker did not start'));
            }, 10_000);
            const listener = (event: MessageEvent) => {
                if (event.source !== iframe.contentWindow) {
                    return;
                }
                if (event.data?.type === 'ghost-addon-worker-ready') {
                    removeStaticStartupListener();
                    resolvePromise();
                }
                if (event.data?.type === 'ghost-addon-worker-error') {
                    removeStaticStartupListener();
                    rejectPromise(new Error(event.data.message || 'Static add-on Worker failed to start'));
                }
            };
            removeStaticStartupListener = () => {
                window.clearTimeout(timeout);
                window.removeEventListener('message', listener);
            };
            window.addEventListener('message', listener);
        }) : Promise.resolve();
        // '*' is required: an opaque origin cannot be named as a target origin.
        iframe.contentWindow.postMessage(
            {type: 'ghost-addon-init', bootstrap: bootstrapSource},
            '*',
            [channel.port2]
        );
        await staticStartup;

        const thread = new ThreadMessagePort<SandboxExports>(channel.port1, {
            functions: new ThreadFunctionsManualMemoryManagement()
        });
        channel.port1.start();
        this.port = channel.port1;
        this.sandbox = thread.imports;
    }

    private get exports(): import('@quilted/threads').ThreadImports<SandboxExports> {
        if (!this.sandbox) {
            throw new Error('Sandbox has not been started');
        }
        return this.sandbox;
    }

    async loadBundle(options: Omit<Parameters<SandboxExports['loadBundle']>[0], 'source'>): Promise<void> {
        if (!this.staticExecution) {
            return this.exports.loadBundle(options);
        }

        const response = await fetch(options.url, {
            credentials: 'omit',
            referrerPolicy: 'no-referrer'
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch add-on bundle (${response.status}): ${options.url}`);
        }
        const source = await response.text();
        if (options.integrity) {
            await verifyBundleIntegrity(source, options.integrity);
        }
        return this.exports.loadBundle({url: options.url, source});
    }

    render(options: Parameters<SandboxExports['render']>[0]): Promise<void> {
        return this.exports.render(options);
    }

    shouldRender(options: Parameters<SandboxExports['shouldRender']>[0]): Promise<boolean> {
        return this.exports.shouldRender(options);
    }

    renderBlock(options: Parameters<SandboxExports['renderBlock']>[0]): Promise<Awaited<ReturnType<SandboxExports['renderBlock']>>> {
        return this.exports.renderBlock(options);
    }

    renderSettings(options: Parameters<SandboxExports['renderSettings']>[0]): Promise<void> {
        return this.exports.renderSettings(options);
    }

    updateSettingsProps(props: Record<string, unknown>): Promise<void> {
        return this.exports.updateSettingsProps(props);
    }

    updateData(data: Parameters<SandboxExports['updateData']>[0]): Promise<void> {
        return this.exports.updateData(data);
    }

    destroy(): void {
        this.destroyed = true;
        this.port?.close();
        this.port = null;
        this.sandbox = null;
        this.iframe?.remove();
        this.iframe = null;
    }
}
