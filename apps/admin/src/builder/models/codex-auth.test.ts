import { describe, expect, it } from 'vitest';

import { codexAccessTokenFromAuthJson } from './codex-auth';

describe('codexAccessTokenFromAuthJson', () => {
  it('extracts the access token from Codex CLI auth.json without retaining the refresh token', () => {
    expect(
      codexAccessTokenFromAuthJson(
        JSON.stringify({
          OPENAI_API_KEY: null,
          last_refresh: '2026-08-21T05:00:00.000Z',
          tokens: {
            access_token: 'codex-access-token',
            account_id: 'account-1',
            id_token: 'id-token',
            refresh_token: 'refresh-token',
          },
        }),
      ),
    ).toBe('codex-access-token');
  });

  it('accepts Pi openai-codex OAuth state files', () => {
    expect(
      codexAccessTokenFromAuthJson(
        JSON.stringify({
          'openai-codex': {
            type: 'oauth',
            access: 'pi-access-token',
            refresh: 'pi-refresh-token',
            expires: Date.now() + 60_000,
          },
        }),
      ),
    ).toBe('pi-access-token');
  });

  it('rejects invalid or oversized state without echoing its contents', () => {
    expect(() =>
      codexAccessTokenFromAuthJson('{"tokens":{"refresh_token":"secret-refresh"}}'),
    ).toThrow('Codex access token');
    expect(() => codexAccessTokenFromAuthJson('x'.repeat(256 * 1024 + 1))).toThrow('too large');
    try {
      codexAccessTokenFromAuthJson('{"tokens":{"refresh_token":"secret-refresh"}}');
    } catch (error) {
      expect(String(error)).not.toContain('secret-refresh');
    }
  });
});
