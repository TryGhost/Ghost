import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitDocsBotSupportTicket } from './docsbot-support-ticket';

describe('submitDocsBotSupportTicket', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the payload and throws when the webhook URL is not configured', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const payload = {
      name: 'Ada',
      email: 'ada@example.com',
      subject: 'Help',
      message: 'Please help',
      history: '**User**\nhi',
      rawHistory: [{ Human: 'hi' }],
      siteUrl: 'https://example.com/',
      currentUrl: 'http://localhost:2368/ghost/#/posts',
      metadata: { conversationUrl: 'https://docsbot.ai/c/1' },
    };

    await expect(submitDocsBotSupportTicket(payload)).rejects.toThrow(
      'Support ticket webhook is not configured',
    );
    expect(info).toHaveBeenCalledWith(
      '[DocsBot] Support ticket webhook is not configured',
      payload,
    );
  });
});
