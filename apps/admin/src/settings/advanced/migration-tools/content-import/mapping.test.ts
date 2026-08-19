import { ContentFieldMapping } from './mapping';

describe('ContentFieldMapping', () => {
  it('keeps every CSV column in the upload contract', () => {
    const mapping = ContentFieldMapping.empty(['Headline', 'Body']).update('Headline', 'title');

    expect(mapping.toJSON()).toEqual({ Headline: 'title', Body: '' });
  });

  it('allows only one CSV column to claim a Ghost field', () => {
    const mapping = ContentFieldMapping.empty(['First title', 'Second title'])
      .update('First title', 'title')
      .update('Second title', 'title');

    expect(mapping.toJSON()).toEqual({ 'First title': '', 'Second title': 'title' });
  });

  it('detects exact field-name headers', () => {
    const mapping = ContentFieldMapping.detect(['title', 'html', 'published_at', 'Something else']);

    expect(mapping.toJSON()).toEqual({
      title: 'title',
      html: 'html',
      published_at: 'published_at',
      'Something else': '',
    });
  });

  it('does not case-fold or guess header mappings', () => {
    const mapping = ContentFieldMapping.detect(['Title', 'Post HTML', 'Published At']);

    expect(mapping.toJSON()).toEqual({ Title: '', 'Post HTML': '', 'Published At': '' });
  });

  it('reports whether the required title target is mapped', () => {
    const missing = ContentFieldMapping.detect(['Headline']);
    const complete = missing.update('Headline', 'title');

    expect(missing.hasTarget('title')).toBe(false);
    expect(complete.hasTarget('title')).toBe(true);
  });
});
