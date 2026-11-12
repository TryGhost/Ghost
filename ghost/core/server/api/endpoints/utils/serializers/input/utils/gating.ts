// Text fields derived from a post's html. Gated blocks and the paywall marker
// only exist in the html, so the output gating can only strip paid text from
// these fields when the html was fetched alongside them.
const HTML_DERIVED_FIELDS = ['plaintext', 'excerpt'];

interface GatingFrame {
  options: { columns?: unknown };
  forcedGatingHtml?: boolean;
}

/**
 * Content API only. When a `?fields=` list asks for html-derived text without
 * the html, select the html as well so the output mapper can gate the text.
 * The forced column is recorded on the frame for the mapper to strip from the
 * response once gating has run.
 */
export const forceGatingHtmlColumn = (frame: GatingFrame): void => {
  const columns = frame.options.columns;

  if (!Array.isArray(columns) || columns.includes('html')) {
    return;
  }

  if (!columns.some((column) => HTML_DERIVED_FIELDS.includes(column))) {
    return;
  }

  columns.push('html');
  frame.forcedGatingHtml = true;
};
