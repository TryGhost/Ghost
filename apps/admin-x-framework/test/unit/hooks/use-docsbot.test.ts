import {
  formatDocsBotHistory,
  normalizeDocsBotHistory,
  normalizeDocsBotMetadata,
  normalizeDocsBotTicket,
} from '../../../src/hooks/use-docsbot';

describe('formatDocsBotHistory', () => {
  it('formats Human and AI turns as a markdown transcript', () => {
    const result = formatDocsBotHistory([
      {
        Human: 'hi',
        timestamp: '2025-05-08T22:56:28.514357',
      },
      {
        AI: 'Hello! How can I assist you today?',
        timestamp: '2025-05-08T22:56:30.645700',
        type: 'answer',
      },
    ]);

    expect(result).toBe(
      [
        '**User** (8 May 2025, 22:56)',
        'hi',
        '',
        '**Assistant** (8 May 2025, 22:56)',
        'Hello! How can I assist you today?',
      ].join('\n'),
    );
  });

  it('omits the timestamp when it is missing', () => {
    expect(
      formatDocsBotHistory([
        { Human: 'How do I connect Zapier?' },
        { AI: 'Visit the integrations tab.' },
      ]),
    ).toBe(
      [
        '**User**',
        'How do I connect Zapier?',
        '',
        '**Assistant**',
        'Visit the integrations tab.',
      ].join('\n'),
    );
  });

  it('skips empty entries', () => {
    expect(
      formatDocsBotHistory([{ Human: '   ' }, { AI: '' }, {}, { Human: 'still need help' }]),
    ).toBe('**User**\nstill need help');
  });
});

describe('normalizeDocsBotHistory', () => {
  it('returns an empty array for non-arrays', () => {
    expect(normalizeDocsBotHistory(null)).toEqual([]);
    expect(normalizeDocsBotHistory({})).toEqual([]);
  });

  it('keeps only string history fields', () => {
    expect(
      normalizeDocsBotHistory([
        { Human: 'hi', extra: 1 },
        { AI: 'hello', timestamp: '2025-01-01T00:00:00Z', type: 'answer' },
        'skip me',
      ]),
    ).toEqual([
      { Human: 'hi', AI: undefined, timestamp: undefined, type: undefined },
      { Human: undefined, AI: 'hello', timestamp: '2025-01-01T00:00:00Z', type: 'answer' },
    ]);
  });
});

describe('normalizeDocsBotMetadata', () => {
  it('returns an empty object for non-objects', () => {
    expect(normalizeDocsBotMetadata(null)).toEqual({});
    expect(normalizeDocsBotMetadata('meta')).toEqual({});
  });

  it('preserves the full metadata object', () => {
    expect(
      normalizeDocsBotMetadata({
        name: 'Ada',
        conversationUrl: 'https://docsbot.ai/c/1',
        custom: { plan: 'pro' },
      }),
    ).toEqual({
      name: 'Ada',
      conversationUrl: 'https://docsbot.ai/c/1',
      custom: { plan: 'pro' },
    });
  });
});

describe('normalizeDocsBotTicket', () => {
  it('returns null when ticket is missing', () => {
    expect(normalizeDocsBotTicket(null)).toBeNull();
    expect(normalizeDocsBotTicket(undefined)).toBeNull();
  });

  it('coerces missing subject and message to empty strings', () => {
    expect(normalizeDocsBotTicket({})).toEqual({ subject: '', message: '' });
  });
});
