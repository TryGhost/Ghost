import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitSupportRequest } from './support-request';

describe('submitSupportRequest', () => {
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

    await expect(submitSupportRequest(payload)).rejects.toThrow(
      'Support request webhook is not configured',
    );
    expect(info).toHaveBeenCalledWith('[Support request] Webhook is not configured', payload);
  });
});
