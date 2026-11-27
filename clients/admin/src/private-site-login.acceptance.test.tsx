import { describe, expect, it } from 'vitest';

import {
  fakeEndpoint,
  renderAdminApp,
  settingsResponse,
  settleRequests,
  siteResponse,
} from '@test-utils/acceptance';

const PRIVATE_LOGIN_URL = `${String(siteResponse().site.url)}private/`;

describe('Private site login', () => {
  it('signs into a private site frontend once on load', async () => {
    const privateLogin = fakeEndpoint('POST', PRIVATE_LOGIN_URL, {});

    await renderAdminApp('/site', {
      boot: {
        browseSettings: {
          response: settingsResponse({ settings: { is_private: true, password: 'open sesame' } }),
        },
      },
    });

    await expect.poll(() => privateLogin.requests).toHaveLength(1);
    await settleRequests();
    expect(privateLogin.requests).toHaveLength(1);
    expect(privateLogin.lastRequest?.url).toBe(`${PRIVATE_LOGIN_URL}?r=%2F`);
    expect(privateLogin.lastRequest?.body).toEqual({ password: 'open sesame' });
  });

  it('leaves a public site frontend alone', async () => {
    const privateLogin = fakeEndpoint('POST', PRIVATE_LOGIN_URL, {});

    await renderAdminApp('/site');

    await settleRequests();
    expect(privateLogin.requests).toHaveLength(0);
  });
});
