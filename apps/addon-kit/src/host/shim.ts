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
export const SANDBOX_SRCDOC = `<!doctype html>
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
