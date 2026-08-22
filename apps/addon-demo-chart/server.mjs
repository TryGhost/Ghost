import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';

const port = Number(process.env.PORT ?? 4653);
const dist = join(import.meta.dirname, 'dist');
const contentTypes = {
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
};

createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Cache-Control', 'no-store');
    const url = new URL(request.url ?? '/', `http://localhost:${port}`);
    const pathname = url.pathname === '/' ? '/manifest.json' : url.pathname;
    const filePath = normalize(join(dist, pathname));

    if (!filePath.startsWith(dist)) {
        response.writeHead(403).end();
        return;
    }

    try {
        const body = await readFile(filePath);
        response.writeHead(200, {'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream'});
        response.end(body);
    } catch {
        response.writeHead(404, {'Content-Type': 'application/json; charset=utf-8'});
        response.end(JSON.stringify({error: `Not found: ${pathname}. Run pnpm build first.`}));
    }
}).listen(port, () => {
    console.log(`Chart demo provider serving on http://localhost:${port}`); // eslint-disable-line no-console
});
