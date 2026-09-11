/**
 * Dynamically loads the Koenig Lexical editor.
 *
 * In development (Vite), we import the ESM module directly from node_modules.
 * This ensures React is properly deduped by Vite's bundler, avoiding the
 * "Invalid hook call" errors that occur when the UMD bundle (which includes
 * its own bundled React) is loaded alongside Vite's React.
 *
 * Only the UMD bundle injects Koenig's stylesheet; the ESM bundle leaves it
 * to the consumer, so it is loaded here alongside the module.
 */
export async function fetchKoenigLexical(): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [koenig] = await Promise.all([
    import('@tryghost/koenig-lexical'),
    import('@tryghost/koenig-lexical/style.css'),
  ]);
  return koenig;
}
