import { describe, expect, it } from 'vitest';
import { parseConfiguration } from '../src/model.ts';

const show = {
  id: 'show-one',
  title: 'First show',
  description: '',
  artwork: '',
  author: '',
  language: 'en',
  explicit: false,
};

describe('show configuration', () => {
  it('keeps stable identities when a show is renamed and supports several shows', () => {
    const config = parseConfiguration({
      shows: [show, { ...show, id: 'show-two', title: 'Second show' }],
    });
    config.shows[0].title = 'Renamed';
    expect(parseConfiguration(config).shows.map((item) => item.id)).toEqual([
      'show-one',
      'show-two',
    ]);
    expect(show.title).toBe('First show');
  });
  it('allows a new install with no shows', () => {
    expect(parseConfiguration(null)).toEqual({ shows: [] });
  });
  it('rejects duplicate IDs, missing titles, and unsafe artwork', () => {
    expect(() => parseConfiguration({ shows: [show, show] })).toThrow('unique stable ID');
    expect(() => parseConfiguration({ shows: [{ ...show, title: ' ' }] })).toThrow('title');
    expect(() =>
      parseConfiguration({ shows: [{ ...show, artwork: 'javascript:alert(1)' }] }),
    ).toThrow('HTTP');
  });
});
