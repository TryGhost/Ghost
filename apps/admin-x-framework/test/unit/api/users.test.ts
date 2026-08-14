import type {UserRoleType} from '../../../src/api/roles';
import {canManageAutomations} from '../../../src/api/users';

const userWithRole = (roleName: UserRoleType) => ({
    roles: [{name: roleName}]
});

describe('users api helpers', () => {
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
