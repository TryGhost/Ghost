/**
 * Dynamically loads the Koenig Lexical editor and its stylesheet, which the
 * package ships separately from the module.
 */
export async function fetchKoenigLexical(): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [koenig] = await Promise.all([
    import('@tryghost/koenig-lexical'),
    import('@tryghost/koenig-lexical/style.css'),
  ]);
  return koenig;
}
