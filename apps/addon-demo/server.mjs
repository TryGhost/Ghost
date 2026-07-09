/**
 * Tiny provider server standing in for an add-on's own infrastructure. Serves
 * the built bundles + manifest with CORS (`Access-Control-Allow-Origin: *`) —
 * required because the opaque-origin sandbox fetches bundles with
 * `Origin: null` — plus the demo add-on's backend: an in-memory SEO report
 * store. The report endpoints require the `x-ghost-dev-identity` header the
 * host attaches to `ghost.fetch` calls, so they are only reachable through
 * the bridge (curl without the header gets a 401).
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';

const PORT = Number(process.env.PORT ?? 4650);
const DIST = join(import.meta.dirname, 'dist');

const CONTENT_TYPES = {
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
};

// The report a real provider would keep per site; in-memory for the demo.
let report = null;

function sendJson(res, status, body) {
    res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify(body));
}

function readIdentity(req) {
    try {
        const identity = JSON.parse(req.headers['x-ghost-dev-identity'] ?? '');
        return identity && typeof identity.site === 'string' ? identity : null;
    } catch {
        return null;
    }
}

async function readBody(req) {
    let raw = '';
    for await (const chunk of req) {
        raw += chunk;
    }
    return raw ? JSON.parse(raw) : {};
}

function scoreFromChecks(checks) {
    const errors = checks.filter(check => check.severity === 'error').length;
    const warnings = checks.filter(check => check.severity === 'warning').length;
    return Math.max(20, Math.min(100, 100 - (errors * 9) - (warnings * 4)));
}

const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, x-ghost-dev-identity');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

    if (url.pathname.startsWith('/api/')) {
        const identity = readIdentity(req);
        if (!identity) {
            sendJson(res, 401, {error: 'Missing Ghost identity — this endpoint is only reachable through ghost.fetch'});
            return;
        }

        if (url.pathname === '/api/report' && req.method === 'GET') {
            sendJson(res, 200, {report});
            return;
        }

        if (url.pathname === '/api/crawl' && req.method === 'POST') {
            let body;
            try {
                body = await readBody(req);
            } catch {
                sendJson(res, 400, {error: 'Invalid JSON body'});
                return;
            }
            const checks = Array.isArray(body.checks) ? body.checks : [];
            const score = scoreFromChecks(checks);
            const crawledAt = new Date().toISOString();
            report = {
                score,
                scoreHistory: [...(report?.scoreHistory ?? []), score].slice(-20),
                checks,
                postsScanned: Number(body.postsScanned ?? 0),
                lastCrawledAt: crawledAt,
                crawls: [...(report?.crawls ?? []), {at: crawledAt, score, postsScanned: Number(body.postsScanned ?? 0)}].slice(-10)
            };
            sendJson(res, 200, {report});
            return;
        }

        if (url.pathname === '/api/clear' && req.method === 'POST') {
            report = null;
            sendJson(res, 200, {report});
            return;
        }

        sendJson(res, 404, {error: `Unknown API route: ${req.method} ${url.pathname}`});
        return;
    }

    const pathname = url.pathname === '/' ? '/manifest.json' : url.pathname;
    const filePath = normalize(join(DIST, pathname));
    if (!filePath.startsWith(DIST)) {
        res.writeHead(403);
        res.end();
        return;
    }

    try {
        const body = await readFile(filePath);
        res.writeHead(200, {'Content-Type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream'});
        res.end(body);
    } catch {
        sendJson(res, 404, {error: `Not found: ${pathname}. Run \`pnpm build\` first.`});
    }
});

server.listen(PORT, () => {
    console.log(`Add-on demo provider serving on http://localhost:${PORT} (manifest at /manifest.json)`); // eslint-disable-line no-console
});
