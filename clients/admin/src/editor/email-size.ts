/** Gmail clips a message behind "View entire message" from this size on. */
export const EMAIL_SIZE_LIMIT_BYTES = 100 * 1024;

// A sent link becomes `{siteUrl}/r/{8 hex}?m={36-char uuid}`; everything after the site URL is 50 characters.
const REWRITTEN_URL_PATH_LENGTH = 50;

const CONTENT_START_MARKER = '<!-- POST CONTENT START -->';
const CONTENT_END_MARKER = '<!-- POST CONTENT END -->';

export interface EmailSizeEstimate {
  overLimit: boolean;
  /** The estimated size, rounded to whole kilobytes of 1024 bytes. */
  sizeKb: number;
}

function postContent(html: string): string {
  const start = html.indexOf(CONTENT_START_MARKER);
  const end = html.indexOf(CONTENT_END_MARKER);

  if (start !== -1 && end !== -1 && end > start) {
    return html.substring(start + CONTENT_START_MARKER.length, end);
  }
  return html;
}

/** How many bytes the content's links grow by once the send rewrites them for click tracking. */
function linkRewritingAdjustment(html: string, siteUrl: string): number {
  const rewrittenUrlLength = siteUrl.replace(/\/$/, '').length + REWRITTEN_URL_PATH_LENGTH;
  let adjustment = 0;

  for (const [, url] of postContent(html).matchAll(/href="([^"]+)"/g)) {
    if ((url.startsWith('%%{') && url.endsWith('}%%')) || url === '#') {
      continue;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      continue;
    }
    adjustment += rewrittenUrlLength - url.length;
  }

  return adjustment;
}

/**
 * Estimates the size of the email a post would be sent as, from its rendered
 * preview and the site URL its tracked links are rewritten under.
 */
export function estimateEmailSize(html: string, siteUrl: string): EmailSizeEstimate {
  const previewBytes = new Blob([html]).size;
  const estimatedBytes = Math.max(0, previewBytes + linkRewritingAdjustment(html, siteUrl));

  return {
    overLimit: estimatedBytes >= EMAIL_SIZE_LIMIT_BYTES,
    sizeKb: Math.round(estimatedBytes / 1024),
  };
}
