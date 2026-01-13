/**
 * Dynamically loads the Koenig Lexical editor.
 *
 * In development (Vite), we import the ESM module directly from node_modules.
 * This ensures React is properly deduped by Vite's bundler, avoiding the
 * "Invalid hook call" errors that occur when the UMD bundle (which includes
 * its own bundled React) is loaded alongside Vite's React.
 *
 * For local Koenig development, set KOENIG_PATH in vite.config.ts to alias
 * @tryghost/koenig-lexical to your local Koenig source (yarn dev:lexical).
 */
export async function fetchKoenigLexical(): Promise<unknown> {
    // Import the ESM module directly - Vite will handle React deduplication
    // When KOENIG_PATH is set, Vite aliases this to the local source
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const koenig = await import('@tryghost/koenig-lexical');
    return koenig;
}
