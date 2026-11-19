import {
  type StoredMemberView,
  buildViewsForDelete,
  buildViewsForSave,
  parseSharedViewsJSON,
} from './member-views-from-settings';
import { describe, expect, it, vi } from 'vitest';

describe('member-views-from-settings', () => {
  describe('parseSharedViewsJSON', () => {
    it('returns only valid member views', () => {
      const result = parseSharedViewsJSON(
        JSON.stringify([
          {
            name: 'Paid members',
            route: 'members',
            filter: { filter: 'status:paid' },
          },
          {
            name: 'Posts view',
            route: 'posts',
            filter: { type: 'draft' },
          },
          {
            name: 'Broken member view',
            route: 'members',
            filter: {},
          },
        ]),
      );

      expect(result.ok).toBe(true);
      expect(result.ok && result.views).toEqual([
        {
          name: 'Paid members',
          route: 'members',
          filter: { filter: 'status:paid' },
        },
      ]);
    });

    it('returns an error when shared_views is not valid JSON', () => {
      const result = parseSharedViewsJSON('{');

      expect(result.ok).toBe(false);
    });

    it('falls back to an empty array when shared_views is not an array', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = parseSharedViewsJSON('{}');

      expect(result).toEqual({ ok: true, views: [] });

      errorSpy.mockRestore();
    });
  });

  describe('buildViewsForSave', () => {
    it('creates a new member view using the canonical filter payload', () => {
      expect(buildViewsForSave([], 'Paid members', 'status:paid')).toEqual([
        {
          name: 'Paid members',
          route: 'members',
          filter: { filter: 'status:paid' },
        },
      ]);
    });

    it('rejects duplicate names for different member views', () => {
      expect(() => {
        buildViewsForSave(
          [
            {
              name: 'Paid members',
              route: 'members',
              filter: { filter: 'status:paid' },
            },
          ],
          'paid members',
          'status:free',
        );
      }).toThrow('A view with this name already exists');
    });

    it('updates an existing member view when the original view is provided', () => {
      const originalView: StoredMemberView = {
        name: 'Paid members',
        route: 'members',
        filter: { filter: 'status:paid' },
      };

      expect(
        buildViewsForSave([originalView], 'VIP members', 'label:[vip]', 'status:paid'),
      ).toEqual([
        {
          name: 'VIP members',
          route: 'members',
          filter: { filter: 'label:[vip]' },
        },
      ]);
    });
  });

  describe('buildViewsForDelete', () => {
    it('removes the targeted member view', () => {
      const memberView: StoredMemberView = {
        name: 'Paid members',
        route: 'members',
        filter: { filter: 'status:paid' },
      };

      expect(
        buildViewsForDelete(
          [
            memberView,
            {
              name: 'Drafts',
              route: 'posts',
              color: 'blue',
              filter: { type: 'draft' },
            },
          ],
          'status:paid',
        ),
      ).toEqual([
        {
          name: 'Drafts',
          route: 'posts',
          color: 'blue',
          filter: { type: 'draft' },
        },
      ]);
    });
  });
});
