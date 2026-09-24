// The embed renderer (public/embed-renderer) shows embed card html on a separate
// origin, so embed scripts can't reach the editor or the Admin session. It's
// used when the host configures `cardConfig.embedPreviewUrl`.

// Bump when the messages below change, and add public/embed-renderer/v<N>.html
// alongside the old file, so editors and renderers on either side of a deploy
// keep working together.
export const EMBED_RENDERER_VERSION = 1;

export const EMBED_READY_MESSAGE = 'kg-embed-ready';
export const EMBED_RENDER_MESSAGE = 'kg-embed-render';
export const EMBED_RESIZE_MESSAGE = 'kg-embed-resize';

// The renderer's origin holds nothing, so allow-same-origin is safe and keeps
// embed players (YouTube, Vimeo, etc.) on their own origins.
export const EMBED_RENDERER_PERMISSIONS = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation';

export const EMBED_RENDERER_TIMEOUT = 10000;

// The height comes from the embed itself, so cap what the editor will apply:
// an embed that asks for a huge preview would otherwise bury the rest of the post.
export const EMBED_RENDERER_MAX_HEIGHT = 5000;

// Returns the height to apply, or null when the message can't be trusted.
export function resolveEmbedHeight(value: unknown): number | null {
    const height = Number(value);

    if (!Number.isFinite(height) || height <= 0) {
        return null;
    }

    return Math.min(Math.ceil(height), EMBED_RENDERER_MAX_HEIGHT);
}

// `previewUrl` is the directory holding the versioned renderer files. Returns
// null when it can't be used safely, so the editor fails closed.
export function getEmbedRendererUrl(previewUrl: string, editorOrigin: string): URL | null {
    let base: URL;
    let editor: URL;
    try {
        base = new URL(previewUrl);
        editor = new URL(editorOrigin);
    } catch {
        return null;
    }

    if (!['https:', 'http:'].includes(base.protocol) || base.hostname === editor.hostname) {
        return null;
    }

    if (!base.pathname.endsWith('/')) {
        base.pathname = `${base.pathname}/`;
    }

    return new URL(`v${EMBED_RENDERER_VERSION}.html`, base);
}
