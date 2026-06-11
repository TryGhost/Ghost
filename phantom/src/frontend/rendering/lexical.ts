// The kg packages' ESM builds don't load under native Node ESM resolution
// (extensionless lodash imports, CJS-only `lexical` named exports), so Node
// consumes the CJS builds the same way ghost/core does. Workers builds go
// through a bundler (which resolves the ESM builds fine) and inject a
// linkedom document because jsdom — the renderer's Node-side default —
// cannot run in workerd.
type LexicalRenderer = {
    render: (state: never, options: never) => Promise<string>;
};

const isWorkerd = typeof navigator !== 'undefined'
    && (navigator as {userAgent?: string}).userAgent === 'Cloudflare-Workers';

let rendererPromise: Promise<LexicalRenderer> | null = null;

const createRenderer = async (): Promise<LexicalRenderer> => {
    if (isWorkerd) {
        const [{DEFAULT_NODES}, {LexicalHTMLRenderer}, {parseHTML}] = await Promise.all([
            import('@tryghost/kg-default-nodes'),
            import('@tryghost/kg-lexical-html-renderer'),
            import('linkedom')
        ]);
        const {window} = parseHTML('<!DOCTYPE html><html><head></head><body></body></html>');
        return new LexicalHTMLRenderer({nodes: DEFAULT_NODES, dom: {window}} as never) as LexicalRenderer;
    }

    const {createRequire} = await import('node:module');
    const require = createRequire(import.meta.url);
    const {DEFAULT_NODES} = require('@tryghost/kg-default-nodes');
    const {LexicalHTMLRenderer} = require('@tryghost/kg-lexical-html-renderer');
    return new LexicalHTMLRenderer({nodes: DEFAULT_NODES}) as LexicalRenderer;
};

export const renderLexicalHtml = async (lexical: Record<string, unknown>) => {
    rendererPromise ??= createRenderer().catch((error: unknown) => {
        // Don't cache a failed init; the next render retries.
        rendererPromise = null;
        throw error;
    });
    const renderer = await rendererPromise;
    return renderer.render(lexical as never, {
        feature: {
            contentVisibility: false,
            emailCustomization: true,
            emailUniqueid: false
        }
    } as never);
};
