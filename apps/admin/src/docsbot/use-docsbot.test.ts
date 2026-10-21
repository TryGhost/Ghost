import {
  addBotMessageWhenReady,
  formatDocsBotHistory,
  normalizeDocsBotHistory,
  normalizeDocsBotMetadata,
  normalizeDocsBotTicket,
  toSupportRequestDraft,
} from './use-docsbot';

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
        name: 'Jamie',
        conversationUrl: 'https://docsbot.ai/c/1',
        custom: { plan: 'pro' },
      }),
    ).toEqual({
      name: 'Jamie',
      conversationUrl: 'https://docsbot.ai/c/1',
      custom: { plan: 'pro' },
    });
  });

  it('drops named fields that are not strings', () => {
    const metadata = normalizeDocsBotMetadata({
      name: 42,
      email: { address: 'jamie@example.com' },
      conversationId: null,
      conversationUrl: ['https://docsbot.ai/c/1'],
    });

    expect(metadata.name).toBeUndefined();
    expect(metadata.email).toBeUndefined();
    expect(metadata.conversationId).toBeUndefined();
    expect(metadata.conversationUrl).toBeUndefined();
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

describe('toSupportRequestDraft', () => {
  it('maps a DocsBot support request to a support request draft', () => {
    const draft = toSupportRequestDraft(
      [
        { Human: 'I cannot publish a post', timestamp: '2025-05-08T22:56:28.514357' },
        { AI: 'Have you checked your permissions?', timestamp: '2025-05-08T22:56:30.645700' },
      ],
      {
        name: 'Jamie Larson',
        email: 'jamie@example.com',
        conversationId: 'conv-1',
        conversationUrl: 'https://docsbot.ai/conversation/conv-1',
      },
      {
        subject: 'Cannot publish a post',
        message: 'I still cannot publish after checking permissions.',
      },
      'http://localhost:2368/ghost/#/posts',
    );

    expect(draft).toEqual({
      subject: 'Cannot publish a post',
      message: 'I still cannot publish after checking permissions.',
      source: 'chat',
      pageUrl: 'http://localhost:2368/ghost/#/posts',
      context: {
        chat_url: 'https://docsbot.ai/conversation/conv-1',
        chat_transcript: [
          '**User** (8 May 2025, 22:56)',
          'I cannot publish a post',
          '',
          '**Assistant** (8 May 2025, 22:56)',
          'Have you checked your permissions?',
        ].join('\n'),
      },
    });
  });

  it('leaves out ticket fields and context that DocsBot does not provide', () => {
    const draft = toSupportRequestDraft([], null, null, 'http://localhost:2368/ghost/');

    expect(draft).toEqual({
      subject: undefined,
      message: undefined,
      source: 'chat',
      pageUrl: 'http://localhost:2368/ghost/',
      context: {},
    });
  });
});

describe('addBotMessageWhenReady', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.DocsBotAI;
  });

  // Mirrors DocsBot: a message sent before the chat panel is ready is dropped
  // and its promise never settles.
  function mockWidget({ readyAfterAttempts }: { readyAfterAttempts: number }) {
    const messages: string[] = [];
    let attempts = 0;

    window.DocsBotAI = {
      addBotMessage: vi.fn((message: string) => {
        attempts += 1;

        if (attempts <= readyAfterAttempts) {
          return new Promise<void>(() => {});
        }

        messages.push(message);

        return Promise.resolve();
      }),
    };

    return { messages };
  }

  it('retries until the chat panel is ready and adds the message once', async () => {
    const { messages } = mockWidget({ readyAfterAttempts: 2 });

    const result = addBotMessageWhenReady('Thanks');

    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(true);
    expect(messages).toEqual(['Thanks']);
    expect(window.DocsBotAI?.addBotMessage).toHaveBeenCalledTimes(3);
  });

  it('gives up when the chat panel never becomes ready', async () => {
    const { messages } = mockWidget({ readyAfterAttempts: Infinity });

    const result = addBotMessageWhenReady('Thanks');

    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(false);
    expect(messages).toEqual([]);
  });

  it('returns false when the widget is not mounted', async () => {
    window.DocsBotAI = { addBotMessage: vi.fn(() => Promise.resolve(false as const)) };

    await expect(addBotMessageWhenReady('Thanks')).resolves.toBe(false);
    expect(window.DocsBotAI.addBotMessage).toHaveBeenCalledTimes(1);
  });

  it('returns false when the SDK is not loaded', async () => {
    await expect(addBotMessageWhenReady('Thanks')).resolves.toBe(false);
  });
});
