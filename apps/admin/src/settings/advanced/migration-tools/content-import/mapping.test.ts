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
});
