/**
 * The srcdoc for the sandbox iframe. Deliberately tiny and dependency-free:
 * it waits for a single init message from the host carrying the bootstrap
 * source and a MessagePort, evaluates the bootstrap, and hands over control.
 * Delivering the bootstrap via postMessage (structured clone) avoids any
 * string-escaping of the bundled code inside the srcdoc.
 *
 * The shim script lives in <head> so document.body stays empty — the
 * RemoteMutationObserver in the bootstrap observes body and must only ever
 * see gh-* elements rendered by the add-on.
 */
import {STATIC_EXECUTION_CSP} from '../sandbox/static-execution-policy.ts';

interface SandboxSrcdocOptions {
    staticExecution?: boolean;
}

export function createSandboxSrcdoc({staticExecution = false}: SandboxSrcdocOptions = {}): string {
    if (staticExecution) {
        return `<!doctype html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="${STATIC_EXECUTION_CSP}">
<script>
window.addEventListener('message', function init(event) {
    var data = event.data;
    if (!data || data.type !== 'ghost-addon-init' || !event.ports || !event.ports[0]) {
        return;
    }
    window.removeEventListener('message', init);
    var workerSource = data.bootstrap + '\\nself.addEventListener("message", function initWorker(event) {'
        + 'if (!event.data || event.data.type !== "ghost-addon-worker-init" || !event.ports || !event.ports[0]) { return; }'
        + 'self.removeEventListener("message", initWorker);'
        + 'self.__ghostAddonBootstrap({port: event.ports[0]});'
        + 'self.postMessage({type: "ghost-addon-worker-ready"});'
        + '});';
    var workerUrl = URL.createObjectURL(new Blob([workerSource], {type: 'text/javascript'}));
    var worker = new Worker(workerUrl);
    URL.revokeObjectURL(workerUrl);
    worker.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'ghost-addon-worker-ready') {
            window.parent.postMessage({type: 'ghost-addon-worker-ready'}, '*');
        }
    });
    worker.addEventListener('error', function (event) {
        window.parent.postMessage({
            type: 'ghost-addon-worker-error',
            message: event.message || 'Static add-on Worker failed to start'
        }, '*');
    });
    worker.postMessage({type: 'ghost-addon-worker-init'}, [event.ports[0]]);
});
</script>
</head>
<body></body>
</html>`;
    }

    return `<!doctype html>
<html>
<head>
<script>
window.addEventListener('message', function init(event) {
    var data = event.data;
    if (!data || data.type !== 'ghost-addon-init' || !event.ports || !event.ports[0]) {
        return;
    }
    window.removeEventListener('message', init);
    (0, eval)(data.bootstrap);
    window.__ghostAddonBootstrap({port: event.ports[0]});
});
</script>
</head>
<body></body>
</html>`;
}

export const SANDBOX_SRCDOC = createSandboxSrcdoc();
