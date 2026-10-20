#!/usr/bin/env node
import { createServer, type Server, type ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';

const DEFAULT_PORT = 4545;

const PAGE = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Webhooks</title></head>
<body>
<h1>Webhooks</h1>
<p>Send JSON to <code>POST /webhook</code>. Newest first.</p>
<div id="payloads"></div>
<script>
const payloads = document.getElementById('payloads');
new EventSource('/events').onmessage = (event) => {
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(JSON.parse(event.data), null, 2);
  payloads.prepend(document.createElement('hr'), pre);
};
</script>
</body>
</html>
`;

type Payload = { received_at: string; method: string; url: string; body: unknown };

/**
 * A development server that records webhook payloads and streams them to a
 * browser. Add `?status=500` (or any status) to a webhook URL to test failures.
 */
export function createWebhookServer(): Server {
  const payloads: Payload[] = [];
  const listeners = new Set<ServerResponse>();
  const send = (res: ServerResponse, payload: Payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(PAGE);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      for (const payload of payloads) {
        send(res, payload);
      }
      listeners.add(res);
      req.on('close', () => listeners.delete(res));
      return;
    }

    if ((req.method === 'POST' || req.method === 'PUT') && url.pathname === '/webhook') {
      let raw = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => {
        raw += chunk;
      });
      req.on('end', () => {
        let body: unknown = raw;
        try {
          body = JSON.parse(raw);
        } catch {
          // Show invalid JSON as the raw string.
        }
        const payload = {
          received_at: new Date().toISOString(),
          method: req.method ?? '',
          url: url.pathname + url.search,
          body,
        };
        payloads.push(payload);
        for (const listener of listeners) {
          send(listener, payload);
        }
        res.writeHead(Number(url.searchParams.get('status')) || 204).end();
      });
      return;
    }

    res.writeHead(404).end('Not found\n');
  });

  server.on('close', () => {
    for (const listener of listeners) {
      listener.end();
    }
  });

  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? process.env.PORT ?? DEFAULT_PORT);
  createWebhookServer().listen(port, () => {
    process.stdout.write(
      `Webhook server listening on http://localhost:${port}\n` +
        `  POST http://localhost:${port}/webhook  receives webhooks\n` +
        `  GET  http://localhost:${port}/         shows them as they arrive\n`,
    );
  });
}
