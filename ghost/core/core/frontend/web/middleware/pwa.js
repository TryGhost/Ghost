const debug = require('@tryghost/debug')('frontend:pwa');

function injectPWAHeaders(req, res, next) {
    const _write = res.write;
    const _end = res.end;
    const chunks = [];

    // Override write
    res.write = function (chunk) {
        chunks.push(Buffer.from(chunk));
        return true;
    };

    // Override end
    res.end = function (chunk) {
        if (chunk) {
            chunks.push(Buffer.from(chunk));
        }

        const body = Buffer.concat(chunks).toString('utf8');

        if (res.getHeader('content-type') && res.getHeader('content-type').includes('text/html')) {
            debug('Injecting PWA headers');

            const pwaHeaders = `
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#15171A">
    <link rel="apple-touch-icon" href="/public/icons/icon-192x192.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <meta name="apple-mobile-web-app-title" content="Ghost Site">
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('Service Worker registered with scope:', registration.scope);
                    })
                    .catch(error => {
                        console.error('Service Worker registration failed:', error);
                    });
            });
        }
    </script>
</head>`;

            const modifiedBody = body.replace('</head>', pwaHeaders);

            // Update Content-Length
            res.setHeader('Content-Length', Buffer.byteLength(modifiedBody));

            _write.call(res, modifiedBody);
            _end.call(res);
        } else {
            // For non-HTML responses, just send the original
            _write.call(res, body);
            _end.call(res);
        }
    };

    next();
}

module.exports = injectPWAHeaders;
