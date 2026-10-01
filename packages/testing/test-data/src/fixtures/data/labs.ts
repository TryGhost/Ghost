/**
 * Labs flags default OFF, except GA flags, which Ghost Core always reports as
 * ON — they default ON here so tests mirror production. `settingsResponse` and
 * `configResponse` both merge per-test overrides over this map, so a flag
 * flipped via `{labs}` flips in both places at once (the admin client reads
 * labs from settings AND config).
 */
export const labsDefaults: Record<string, boolean> = {
  postsListReact: true,
  membersActivityReact: true,
  superEditors: false,
  editorExcerpt: false,
  additionalPaymentMethods: false,
};
