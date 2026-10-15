import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitSupportTicket } from './support-ticket';

describe('submitSupportTicket', () => {
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
      source: 'docsbot',
      siteUrl: 'https://example.com/',
      pageUrl: 'http://localhost:2368/ghost/#/posts',
      conversationUrl: 'https://docsbot.ai/c/1',
      transcript: '**User**\nhi',
    };

    await expect(submitSupportTicket(payload)).rejects.toThrow(
      'Support ticket webhook is not configured',
    );
    expect(info).toHaveBeenCalledWith('[Support ticket] Webhook is not configured', payload);
  });
});
