#!/usr/bin/env node
// @ts-check

/* eslint-disable no-console */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');

const GHOST_URL = process.env.GHOST_URL || 'http://localhost:2368';
const GOLDEN_POST_PATH = path.join(__dirname, '..', 'test', 'utils', 'fixtures', 'email-service', 'golden-post.json');

function usage() {
    console.error('Usage: GHOST_GOLDEN_POST_AUTH=id:secret yarn generate-golden-email <segment> <output-path>');
    console.error('');
    console.error('  segment:     Member segment filter, e.g. "status:free" or "status:-free"');
    console.error('  output-path: Path to write the rendered email HTML');
    console.error('');
    console.error('GHOST_GOLDEN_POST_AUTH should be an Admin API key in id:secret format.');
    console.error('Requires a running Ghost dev instance (yarn dev).');
    process.exit(1);
}

/**
 * @returns {{id: string, secret: string}}
 */
function getAdminApiKey() {
    const auth = process.env.GHOST_GOLDEN_POST_AUTH;
    if (!auth) {
        console.error('Error: GHOST_GOLDEN_POST_AUTH environment variable is required.');
        console.error('Set it to an Admin API key.');
        process.exit(1);
    }
    const [id, secret] = auth.split(':');
    if (id && secret) {
        return {id, secret};
    }
    console.error('Error: GHOST_GOLDEN_POST_AUTH environment variable is invalid.');
    process.exit(1);
}

/**
 * @param {{id: string, secret: string}} apiKey
 * @returns {string}
 */
function signToken(apiKey) {
    return jwt.sign(
        {},
        Buffer.from(apiKey.secret, 'hex'),
        {
            keyid: apiKey.id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/admin/'
        }
    );
}

/**
 * @param {string} token
 * @param {string} method
 * @param {string} endpoint
 * @param {object} [body]
 * @returns {Promise<Record<string, unknown>>}
 */
async function apiRequest(token, method, endpoint, body) {
    // god_mode bypasses the integration token endpoint allowlist in development
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${GHOST_URL}/ghost/api/admin/${endpoint}${separator}god_mode=true`;
    const res = await fetch(url, {
        method,
        headers: {
            Authorization: `Ghost ${token}`,
            'Content-Type': 'application/json'
        },
        ...(body ? {body: JSON.stringify(body)} : {})
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
    const [segment, outputPath] = args;

    const apiKey = getAdminApiKey();
    const token = signToken(apiKey);

    const goldenPost = JSON.parse(fs.readFileSync(GOLDEN_POST_PATH, 'utf8'));

    const createRes = await apiRequest(token, 'POST', 'posts/', {
        posts: [{
            title: 'Golden Email Preview (temp)',
            status: 'draft',
            lexical: JSON.stringify(goldenPost)
        }]
    });
    const postId = createRes.posts[0].id;

    try {
        const previewRes = await apiRequest(
            token,
            'GET',
            `email_previews/posts/${postId}/?memberSegment=${encodeURIComponent(segment)}`
        );
        const html = previewRes.email_previews[0].html;

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
