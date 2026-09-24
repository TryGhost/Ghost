import type { UserRoleType } from '../../../src/api/roles';
import { canAccessSettings, canManageAutomations, isEditorUser } from '../../../src/api/users';

const userWithRole = (roleName: UserRoleType) => ({
  roles: [{ name: roleName }],
});

describe('users api helpers', () => {
  describe('isEditorUser', () => {
    it('returns true for Editor and Super Editor', () => {
      expect(isEditorUser(userWithRole('Editor'))).toBe(true);
      expect(isEditorUser(userWithRole('Super Editor'))).toBe(true);
    });

    it('returns false for Author and Contributor', () => {
      expect(isEditorUser(userWithRole('Author'))).toBe(false);
      expect(isEditorUser(userWithRole('Contributor'))).toBe(false);
    });
  });

  describe('canAccessSettings', () => {
    it('returns true for Owner, Administrator, Editor and Super Editor', () => {
      expect(canAccessSettings(userWithRole('Owner'))).toBe(true);
      expect(canAccessSettings(userWithRole('Administrator'))).toBe(true);
      expect(canAccessSettings(userWithRole('Editor'))).toBe(true);
      expect(canAccessSettings(userWithRole('Super Editor'))).toBe(true);
    });

    it('returns false for Author and Contributor', () => {
      expect(canAccessSettings(userWithRole('Author'))).toBe(false);
      expect(canAccessSettings(userWithRole('Contributor'))).toBe(false);
    });
  });

  describe('canManageAutomations', () => {
    it('returns true for Owner', () => {
      expect(canManageAutomations(userWithRole('Owner'))).toBe(true);
    });

    it('returns true for Administrator', () => {
      expect(canManageAutomations(userWithRole('Administrator'))).toBe(true);
    });

    it('returns false for Super Editor', () => {
      expect(canManageAutomations(userWithRole('Super Editor'))).toBe(false);
    });

    it('returns false for Editor, Author and Contributor', () => {
      expect(canManageAutomations(userWithRole('Editor'))).toBe(false);
      expect(canManageAutomations(userWithRole('Author'))).toBe(false);
      expect(canManageAutomations(userWithRole('Contributor'))).toBe(false);
    });
  });
});
