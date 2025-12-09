/**
 * Dynamically loads the Koenig Lexical editor.
 *
 * In development (Vite), we import the ESM module directly from node_modules.
 * This ensures React is properly deduped by Vite's bundler, avoiding the
 * "Invalid hook call" errors that occur when the UMD bundle (which includes
 * its own bundled React) is loaded alongside Vite's React.
 */
export async function fetchKoenigLexical(): Promise<unknown> {
    // Import the ESM module directly - Vite will handle React deduplication
    const koenig = await import('@tryghost/koenig-lexical');
    return koenig;
}
