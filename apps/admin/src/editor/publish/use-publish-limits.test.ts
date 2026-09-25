import { describe, expect, it } from 'vitest';
import type { Config } from '@tryghost/admin-x-framework/api/config';
import { readEmailVerificationHold } from '@/editor/publish/use-publish-limits';

const HOST_MESSAGE = 'Sending is paused while we review your account.';

function config(hostSettings: Config['hostSettings'] = {}): Config {
  return { hostSettings } as Config;
}

describe('readEmailVerificationHold', () => {
  it('holds sending with the host copy when the setting is on', () => {
    const hold = readEmailVerificationHold(
      [{ key: 'email_verification_required', value: true }],
      config({ emailVerification: { emailSendingDisabledMessage: HOST_MESSAGE } }),
    );

    expect(hold).toEqual({ required: true, message: HOST_MESSAGE });
  });

  it('leaves the message empty when the host has no copy, so the default applies', () => {
    const hold = readEmailVerificationHold(
      [{ key: 'email_verification_required', value: true }],
      config(),
    );

    expect(hold).toEqual({ required: true, message: null });
  });

  it('does not hold sending when the setting is off, missing, or unreadable', () => {
    expect(
      readEmailVerificationHold([{ key: 'email_verification_required', value: false }], config())
        .required,
    ).toBe(false);
    expect(readEmailVerificationHold([], config()).required).toBe(false);
    expect(readEmailVerificationHold(null, undefined).required).toBe(false);
  });
});
