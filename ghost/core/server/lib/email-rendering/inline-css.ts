import juice from 'juice';

/** Inlines the stylesheet rules of an email's HTML into style attributes and drops the style tags. */
export function inlineCss(html: string): string {
  // resolveCSSVariables crashes on nameless declarations in user-authored style attributes
  return juice(html, {
    inlinePseudoElements: true,
    removeStyleTags: true,
    resolveCSSVariables: false,
  });
}
