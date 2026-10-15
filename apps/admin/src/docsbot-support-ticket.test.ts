import { describe, expect, it } from 'vitest';
import { toSupportRequestDraft } from './docsbot-support-ticket';

describe('toSupportRequestDraft', () => {
  it('maps a DocsBot support request to a support request draft', () => {
    const draft = toSupportRequestDraft({
      history: [
        { Human: 'I cannot publish a post', timestamp: '2025-05-08T22:56:28.514357' },
        { AI: 'Have you checked your permissions?', timestamp: '2025-05-08T22:56:30.645700' },
      ],
      metadata: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        conversationId: 'conv-1',
        conversationUrl: 'https://docsbot.ai/conversation/conv-1',
      },
      ticket: {
        subject: 'Cannot publish a post',
        message: 'I still cannot publish after checking permissions.',
      },
      currentUrl: 'http://localhost:2368/ghost/#/posts',
    });

    expect(draft).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: 'Cannot publish a post',
      message: 'I still cannot publish after checking permissions.',
      source: 'docsbot',
      pageUrl: 'http://localhost:2368/ghost/#/posts',
      conversationUrl: 'https://docsbot.ai/conversation/conv-1',
      transcript: [
        '**User** (8 May 2025, 22:56)',
        'I cannot publish a post',
        '',
        '**Assistant** (8 May 2025, 22:56)',
        'Have you checked your permissions?',
      ].join('\n'),
    });
  });

  it('leaves identity and ticket fields empty when DocsBot does not provide them', () => {
    const draft = toSupportRequestDraft({
      history: [],
      metadata: {},
      ticket: null,
      currentUrl: 'http://localhost:2368/ghost/',
    });

    expect(draft).toEqual({
      name: undefined,
      email: undefined,
      subject: undefined,
      message: undefined,
      source: 'docsbot',
      pageUrl: 'http://localhost:2368/ghost/',
      conversationUrl: undefined,
      transcript: '',
    });
  });
});
