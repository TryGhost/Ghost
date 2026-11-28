import { MaintenanceError } from '@tryghost/admin-x-framework/errors';
import { describe, expect, it } from 'vitest';
import { failureOf } from '@/shared/member-custom-fields/use-custom-field-create-attempt';

describe('failureOf', () => {
  // Admin's requests retry a site under maintenance for a while before giving up, longer than a
  // form's acceptance test can wait, so the form's answer to one is checked here.
  it("says in Admin's own words that the site is under maintenance, and lets them try again", () => {
    const failure = failureOf(new MaintenanceError(new Response(null, { status: 503 }), ''));

    expect(failure).toEqual({
      message: 'Ghost is currently undergoing maintenance, please wait a moment then retry.',
      canRetry: true,
      isFault: false,
    });
  });
});
