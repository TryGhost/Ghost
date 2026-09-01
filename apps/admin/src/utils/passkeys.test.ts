import { afterEach, describe, expect, it, vi } from 'vitest';
import { signalStaffPasskeyUserDetails } from './passkeys';
import { type User } from '@tryghost/admin-x-framework/api/users';

describe('staff passkey user detail signals', () => {
  const originalPublicKeyCredential = globalThis.PublicKeyCredential;

  afterEach(() => {
    vi.stubGlobal('PublicKeyCredential', originalPublicKeyCredential);
  });

  it('updates the credential-manager label with the saved staff details', async () => {
    const signalCurrentUserDetails = vi.fn(() => Promise.resolve());
    vi.stubGlobal('PublicKeyCredential', { signalCurrentUserDetails });

    await expect(
      signalStaffPasskeyUserDetails({
        id: 'staff-id',
        email: 'new@example.com',
        name: 'Jamie Larson',
      } as User),
    ).resolves.toBe(true);

    expect(signalCurrentUserDetails).toHaveBeenCalledWith({
      rpId: window.location.hostname,
      userId: 'c3RhZmYtaWQ',
      name: 'new@example.com',
      displayName: 'Jamie Larson',
    });
  });

  it('does nothing when the browser does not support account update signals', async () => {
    vi.stubGlobal('PublicKeyCredential', {});

    await expect(
      signalStaffPasskeyUserDetails({
        id: 'staff-id',
        email: 'new@example.com',
        name: 'Jamie Larson',
      } as User),
    ).resolves.toBe(false);
  });
});
