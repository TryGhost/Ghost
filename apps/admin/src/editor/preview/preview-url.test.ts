import { describe, expect, it } from 'vitest';

import {
  audienceDescription,
  browserPreviewUrl,
  emailPreviewAudience,
  postPreviewUrl,
} from './preview-url';

describe('postPreviewUrl', () => {
  it('builds the uuid preview path on the site', () => {
    expect(postPreviewUrl('https://site.test/', 'abc-uuid')).toBe('https://site.test/p/abc-uuid/');
  });

  it('keeps a subdirectory install in the path', () => {
    expect(postPreviewUrl('https://site.test/blog', 'abc-uuid')).toBe(
      'https://site.test/blog/p/abc-uuid/',
    );
  });

  it('has no preview URL without a uuid', () => {
    expect(postPreviewUrl('https://site.test/', null)).toBe('');
  });
});

describe('browserPreviewUrl', () => {
  it('appends the member status', () => {
    expect(browserPreviewUrl('https://site.test/p/abc/', { segment: 'free' })).toBe(
      'https://site.test/p/abc/?member_status=free',
    );
  });

  it('previews a tier as a paid member of that tier', () => {
    expect(
      browserPreviewUrl('https://site.test/p/abc/', { segment: 'tier', tierSlug: 'gold' }),
    ).toBe('https://site.test/p/abc/?member_status=paid&member_tier=gold');
  });

  it('drops a stale tier when the audience is no longer a tier', () => {
    expect(
      browserPreviewUrl('https://site.test/p/abc/?member_tier=gold', { segment: 'anonymous' }),
    ).toBe('https://site.test/p/abc/?member_status=anonymous');
  });

  it('keeps other query params on the preview URL', () => {
    expect(browserPreviewUrl('https://site.test/p/abc/?foo=bar', { segment: 'paid' })).toBe(
      'https://site.test/p/abc/?foo=bar&member_status=paid',
    );
  });

  it('has nothing to build without a preview URL', () => {
    expect(browserPreviewUrl('', { segment: 'free' })).toBe('');
  });
});

describe('emailPreviewAudience', () => {
  it('maps anonymous and free to a free member', () => {
    expect(emailPreviewAudience({ segment: 'anonymous' })).toEqual({ memberStatus: 'free' });
    expect(emailPreviewAudience({ segment: 'free' })).toEqual({ memberStatus: 'free' });
  });

  it('maps paid to a paid member without a tier', () => {
    expect(emailPreviewAudience({ segment: 'paid' })).toEqual({ memberStatus: 'paid' });
  });

  it('maps a tier to a paid member of that tier', () => {
    expect(emailPreviewAudience({ segment: 'tier', tierSlug: 'gold' })).toEqual({
      memberStatus: 'paid',
      memberTier: 'gold',
    });
  });

  it('omits an empty tier slug', () => {
    expect(emailPreviewAudience({ segment: 'tier', tierSlug: null })).toEqual({
      memberStatus: 'paid',
    });
  });
});

describe('audienceDescription', () => {
  it('names the segment', () => {
    expect(audienceDescription({ segment: 'free' })).toBe('free member');
    expect(audienceDescription({ segment: 'paid' })).toBe('paid member');
  });

  it('names the tier when one is selected', () => {
    expect(audienceDescription({ segment: 'tier', tierSlug: 'gold' }, 'Gold')).toBe(
      'Gold tier member',
    );
  });

  it('falls back to the segment when the tier is unknown', () => {
    expect(audienceDescription({ segment: 'tier', tierSlug: 'gold' })).toBe('tier member');
  });
});
