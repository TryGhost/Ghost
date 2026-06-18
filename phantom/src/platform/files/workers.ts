import {normalizeKey, type FileStore} from './store.js';

// Cloudflare Workers static-assets binding (`env.ASSETS`). The directory it
// serves is staged by src/tools/stage-worker-assets.ts using the same logical
// key namespace as the Node store; html_handling/not_found_handling are
// disabled in wrangler config so this behaves like a plain file lookup.
type AssetsFetcher = {
    fetch: (request: Request | URL) => Promise<Response>;
};

export const createWorkersFileStore = (assets: AssetsFetcher): FileStore => {
    const read = async (rawKey: string) => {
        const key = normalizeKey(rawKey);
        if (!key) {
            return null;
        }
        const url = new URL(`/${key.split('/').map(encodeURIComponent).join('/')}`, 'https://assets.local');
        const response = await assets.fetch(new Request(url));
        if (!response.ok) {
            return null;
        }
        return new Uint8Array(await response.arrayBuffer());
    };

    const readText = async (rawKey: string) => {
        const body = await read(rawKey);
        return body ? new TextDecoder().decode(body) : null;
    };

    return {read, readText};
};
