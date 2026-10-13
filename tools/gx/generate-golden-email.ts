#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

type AdminApiKey = { id: string; secret: string };

const GHOST_URL = process.env.GHOST_URL || 'http://localhost:2368';
const GOLDEN_POST_PATH = fileURLToPath(
  new URL('../../ghost/test/utils/fixtures/email-service/golden-post.json', import.meta.url),
);

function usage(): never {
  console.error(
    'Usage: GHOST_GOLDEN_POST_AUTH=id:secret pnpm gx generate golden-email <segment> <output-path>',
  );
  console.error('');
  console.error('  segment:     Member segment filter, e.g. "status:free" or "status:-free"');
  console.error('  output-path: Path to write the rendered email HTML');
  console.error('');
  console.error('GHOST_GOLDEN_POST_AUTH should be an Admin API key in id:secret format.');
  console.error('Requires a running Ghost dev instance (pnpm dev).');
  process.exit(1);
}

function getAdminApiKey(): AdminApiKey {
  const auth = process.env.GHOST_GOLDEN_POST_AUTH;
  if (!auth) {
    console.error('Error: GHOST_GOLDEN_POST_AUTH environment variable is required.');
    console.error('Set it to an Admin API key.');
    process.exit(1);
  }
  const [id, secret] = auth.split(':');
  if (id && secret) {
    return { id, secret };
  }
  console.error('Error: GHOST_GOLDEN_POST_AUTH environment variable is invalid.');
  process.exit(1);
}

function signToken(apiKey: AdminApiKey): string {
  return jwt.sign({}, Buffer.from(apiKey.secret, 'hex'), {
    keyid: apiKey.id,
    algorithm: 'HS256',
    expiresIn: '5m',
    audience: '/admin/',
  });
}

async function apiRequest(
  token: string,
  method: string,
  endpoint: string,
  body?: object,
): Promise<unknown> {
  // god_mode bypasses the integration token endpoint allowlist in development
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${GHOST_URL}/ghost/api/admin/${endpoint}${separator}god_mode=true`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Ghost ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert(res.ok, `API ${method} ${endpoint} failed (${res.status})`);
  if (res.status === 204) {
    return {};
  }
  return await res.json();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    usage();
  }
  const segment = args[0];
  const outputPath = args[1];
  if (segment === undefined || outputPath === undefined) {
    usage();
  }

  const apiKey = getAdminApiKey();
  const token = signToken(apiKey);

  const goldenPost: unknown = JSON.parse(fs.readFileSync(GOLDEN_POST_PATH, 'utf8'));

  const createRes = await apiRequest(token, 'POST', 'posts/', {
    posts: [
      {
        title: 'Golden Email Preview (temp)',
        status: 'draft',
        lexical: JSON.stringify(goldenPost),
      },
    ],
  });
  assert(createRes && typeof createRes === 'object' && 'posts' in createRes);
  assert(Array.isArray(createRes.posts));
  const post: unknown = createRes.posts[0];
  assert(post && typeof post === 'object' && 'id' in post && typeof post.id === 'string');
  const postId = post.id;

  try {
    const previewRes = await apiRequest(
      token,
      'GET',
      `email_previews/posts/${postId}/?memberSegment=${encodeURIComponent(segment)}`,
    );
    assert(previewRes && typeof previewRes === 'object' && 'email_previews' in previewRes);
    assert(Array.isArray(previewRes.email_previews));
    const preview: unknown = previewRes.email_previews[0];
    assert(
      preview &&
        typeof preview === 'object' &&
        'html' in preview &&
        typeof preview.html === 'string',
    );
    const html = preview.html;

    const resolvedPath = path.resolve(outputPath);
    fs.writeFileSync(resolvedPath, html, 'utf8');
    console.log(`Golden email written to ${resolvedPath}`);
  } finally {
    try {
      await apiRequest(token, 'DELETE', `posts/${postId}/`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Warning: failed to clean up draft post:', message);
    }
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Error:', message);
  process.exit(1);
});
