import { canCopyGiftLink } from './gift-link';
import type { UserRoleType } from '@tryghost/admin-x-framework/api/roles';
import { describe, expect, it } from 'vitest';

/**
 * Ported from `apps/ember-admin/app/utils/gift-link.js`, which the Ember
 * context menu imports. Both implementations now read the same rules, so the
 * entry point can't appear on one side and not the other.
 *
 * A gift link shares a *gated* post with someone who isn't a member, so the
 * two halves of the rule are: a user senior enough to hand out access, and a
 * post that actually withholds it.
 */

const user = (roles: UserRoleType[]) => ({ roles: roles.map((name) => ({ name })) });

const post = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  status: 'published',
  visibility: 'paid',
  ...overrides,
});

describe('canCopyGiftLink', () => {
  describe('who may share one', () => {
    it.each(['Owner', 'Administrator', 'Editor', 'Super Editor'] as const)(
      'allows an %s',
      (role) => {
        expect(canCopyGiftLink({ user: user([role]), post: post() })).toBe(true);
      },
    );

    it.each(['Author', 'Contributor'] as const)('refuses a %s', (role) => {
      expect(canCopyGiftLink({ user: user([role]), post: post() })).toBe(false);
    });
  });

  describe('what may be shared', () => {
    it('allows a published post behind a paywall', () => {
      expect(canCopyGiftLink({ user: user(['Owner']), post: post({ visibility: 'paid' }) })).toBe(
        true,
      );
    });

    it('allows a members-only post', () => {
      expect(
        canCopyGiftLink({ user: user(['Owner']), post: post({ visibility: 'members' }) }),
      ).toBe(true);
    });

    // Nothing to gift: anyone can already read it.
    it('refuses a public post', () => {
      expect(canCopyGiftLink({ user: user(['Owner']), post: post({ visibility: 'public' }) })).toBe(
        false,
      );
    });

    it('refuses a draft, which has nothing to share yet', () => {
      expect(canCopyGiftLink({ user: user(['Owner']), post: post({ status: 'draft' }) })).toBe(
        false,
      );
    });

    it('refuses a scheduled post', () => {
      expect(canCopyGiftLink({ user: user(['Owner']), post: post({ status: 'scheduled' }) })).toBe(
        false,
      );
    });

    it('refuses a post with no visibility set at all', () => {
      expect(
        canCopyGiftLink({ user: user(['Owner']), post: post({ visibility: undefined }) }),
      ).toBe(false);
    });
  });

  it('refuses when there is no post', () => {
    expect(canCopyGiftLink({ user: user(['Owner']), post: undefined })).toBe(false);
  });

  it('refuses when there is no user', () => {
    expect(canCopyGiftLink({ user: undefined, post: post() })).toBe(false);
  });
});
