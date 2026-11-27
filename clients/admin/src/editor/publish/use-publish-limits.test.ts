import { describe, expect, it } from 'vitest';
import type { Config } from '@tryghost/admin-x-framework/api/config';
import { HostLimitError } from '@tryghost/admin-x-framework/errors';
import { LimitCheckError } from '@/editor/publish/publish-options';
import {
  memberCountReadError,
  readEmailVerificationHold,
  rethrowLimitRejection,
} from '@/editor/publish/use-publish-limits';

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

describe('rethrowLimitRejection', () => {
  it('passes a reached limit through as the host’s message', () => {
    const reached = new HostLimitError({ message: 'Over your email limit, please upgrade.' });

    expect(() => rethrowLimitRejection('emails', reached)).toThrow(reached);
  });

  it('turns anything else into a check that could not run', () => {
    const offline = new Error('Network request failed');
    let thrown: unknown;

    try {
      rethrowLimitRejection('emails', offline);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(LimitCheckError);
    expect(thrown).toMatchObject({ limit: 'emails', cause: offline });
  });
});

describe('memberCountReadError', () => {
  const failure = new Error('Authorization failed');

  it('finds a member count that failed during the check', () => {
    expect(memberCountReadError({ status: 'error', error: failure, errorUpdatedAt: 20 }, 10)).toBe(
      failure,
    );
  });

  it('ignores a count that succeeded, or failed before the check started', () => {
    expect(memberCountReadError({ status: 'success', error: null, errorUpdatedAt: 0 }, 10)).toBe(
      null,
    );
    expect(memberCountReadError({ status: 'error', error: failure, errorUpdatedAt: 5 }, 10)).toBe(
      null,
    );
    expect(memberCountReadError(undefined, 10)).toBe(null);
  });
});
