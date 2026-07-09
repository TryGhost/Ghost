import bootstrapSource from '@tryghost/addon-kit/bootstrap';
import {ThreadMessagePort, ThreadFunctionsManualMemoryManagement} from '@quilted/threads';
import {SANDBOX_SRCDOC} from './shim.ts';
import type {SandboxExports} from '../types.ts';

/**
 * Owns one sandbox instance: a hidden `<iframe sandbox="allow-scripts">`
 * (opaque origin — browser-enforced isolation from the admin origin, no
 * cookies, no storage, no ambient credentials) plus the RPC thread into it.
 *
 * One controller = one surface instance. The add-on's tree renders into the
 * iframe's hidden document and is mirrored to the host over the thread.
 */
export class AddonSandboxController {
    private iframe: HTMLIFrameElement | null = null;
    private port: MessagePort | null = null;
    private sandbox: import('@quilted/threads').ThreadImports<SandboxExports> | null = null;
    private destroyed = false;

    async start(): Promise<void> {
        if (this.iframe) {
            throw new Error('Sandbox already started');
        }

        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.title = 'Ghost add-on sandbox';
        iframe.style.display = 'none';
        iframe.srcdoc = SANDBOX_SRCDOC;
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
        // '*' is required: an opaque origin cannot be named as a target origin.
        iframe.contentWindow.postMessage(
            {type: 'ghost-addon-init', bootstrap: bootstrapSource},
            '*',
            [channel.port2]
        );

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

    loadBundle(options: Parameters<SandboxExports['loadBundle']>[0]): Promise<void> {
        return this.exports.loadBundle(options);
    }

    render(options: Parameters<SandboxExports['render']>[0]): Promise<void> {
        return this.exports.render(options);
    }

    shouldRender(options: Parameters<SandboxExports['shouldRender']>[0]): Promise<boolean> {
        return this.exports.shouldRender(options);
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
