import DOMPurify from 'dompurify';

/**
 * A feature image caption is stored HTML. Keeps the same tags and attributes
 * as the site does (`prepareContextResource` in Ghost's
 * `frontend/services/proxy.js`): links and inline formatting.
 */
export function sanitizeCaption(caption: string | null): string {
  return DOMPurify.sanitize(caption ?? '', {
    ALLOWED_TAGS: [
      'a',
      'b',
      'i',
      'span',
      'strong',
      'em',
      'u',
      's',
      'code',
      'mark',
      'sub',
      'sup',
      'br',
    ],
    ALLOWED_ATTR: ['href', 'style'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}
