import {User} from '../../../src/api/users';
import {canManageAutomations} from '../../../src/api/users';

const userWithRole = (roleName: string): User => ({
    roles: [{name: roleName}]
} as unknown as User);

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
