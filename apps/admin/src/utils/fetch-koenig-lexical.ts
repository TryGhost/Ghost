/**
 * Dynamically loads the Koenig Lexical editor.
 *
 * In development (Vite), we import the ESM module directly from node_modules.
 * This ensures React is properly deduped by Vite's bundler, avoiding the
 * "Invalid hook call" errors that occur when the UMD bundle (which includes
 * its own bundled React) is loaded alongside Vite's React.
 */
export async function fetchKoenigLexical(): Promise<unknown> {
    // The ESM bundle does not inject its stylesheet (the UMD bundle Ember
    // loads does), so load it alongside the module. The alias is defined in
    // vite.config.ts because the package only exports its JS entry points.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [koenig] = await Promise.all([
        import('@tryghost/koenig-lexical'),
        import('koenig-lexical-styles.css'),
    ]);
    return koenig;
}
