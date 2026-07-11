/**
 * Labs flags default OFF. `settingsResponse` and `configResponse` both merge
 * per-test overrides over this map, so a flag flipped via `{labs}` flips in
 * both places at once (the admin client reads labs from settings AND config).
 */
export const labsDefaults: Record<string, boolean> = {
    superEditors: false,
    editorExcerpt: false,
    additionalPaymentMethods: false
};
