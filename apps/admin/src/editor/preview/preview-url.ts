/** Which audience the post is previewed as; `tier` narrows the paid audience. */
export type PreviewSegment = 'anonymous' | 'free' | 'paid' | 'tier';

export type PreviewDevice = 'desktop' | 'mobile';

export interface PreviewAudience {
  segment: PreviewSegment;
  tierSlug?: string | null;
}

export interface EmailPreviewAudience {
  memberStatus: 'free' | 'paid';
  memberTier?: string;
}

/** The post's public preview URL: `/p/:uuid/` on the site, empty for a post with no uuid yet. */
export function postPreviewUrl(siteUrl: string, uuid: string | null | undefined): string {
  if (!uuid) {
    return '';
  }

  return `${siteUrl.replace(/\/+$/, '')}/p/${uuid}/`;
}

/** The preview URL with the audience the site should render it for. */
export function browserPreviewUrl(previewUrl: string, audience: PreviewAudience): string {
  if (!previewUrl) {
    return '';
  }

  const url = new URL(previewUrl);
  url.searchParams.set('member_status', audience.segment === 'tier' ? 'paid' : audience.segment);

  if (audience.segment === 'tier' && audience.tierSlug) {
    url.searchParams.set('member_tier', audience.tierSlug);
  } else {
    url.searchParams.delete('member_tier');
  }

  return url.toString();
}

/** The same audience as email preview params; email has no anonymous audience. */
export function emailPreviewAudience(audience: PreviewAudience): EmailPreviewAudience {
  const memberStatus = audience.segment === 'paid' || audience.segment === 'tier' ? 'paid' : 'free';

  if (audience.segment === 'tier' && audience.tierSlug) {
    return { memberStatus, memberTier: audience.tierSlug };
  }

  return { memberStatus };
}

/** How the audience reads in the test-email description, e.g. "Gold tier member". */
export function audienceDescription(audience: PreviewAudience, tierName?: string): string {
  if (audience.segment === 'tier' && tierName) {
    return `${tierName} tier member`;
  }

  return `${audience.segment} member`;
}
