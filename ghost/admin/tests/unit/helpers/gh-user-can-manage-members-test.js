import {describe, it} from 'mocha';
import {expect} from 'chai';
import {ghUserCanManageMembers} from 'ghost-admin/helpers/gh-user-can-manage-members';

describe('Unit: Helper: gh-user-can-manage-members', function () {
    // Mock up roles and test for truthy
    describe('Owner, admin, super editor roles', function () {
        let user = {
            get(role) {
                if (role === 'canManageMembers') {
                    return true;
                }
                throw new Error('unsupported'); 
            }
        };

        it(' - can manage members', function () {
            let result = ghUserCanManageMembers([user]);
            expect(result).to.equal(true);
        });
    });

    describe('Editor, Author & Contributor roles', function () {
        let user = {
            get(role) {
                if (role === 'canManageMembers') {
                    return false;
                }
                throw new Error('unsupported'); 
            }
        };

        it(' - cannot manage members', function () {
            let result = ghUserCanManageMembers([user]);
            expect(result).to.equal(false);
        });
    });
});