import {describe, it} from 'mocha';
import {expect} from 'chai';
import {ghUserCanAdmin} from 'ghost-admin/helpers/gh-user-can-admin';

describe('Unit: Helper: gh-user-can-admin', function () {
    // Mock up roles and test for truthy
    describe('Owner or admin roles', function () {
        const user = {
            get(role) {
                if (role === 'isAdmin') {
                    return true;
                }
                throw new Error('unsupported'); // Make sure we only call get('isAdmin')
            }
        };

        it(' - can be Admin', function () {
            const result = ghUserCanAdmin([user]);
            expect(result).to.equal(true);
        });
    });

    describe('Editor, Author & Contributor roles', function () {
        const user = {
            get(role) {
                if (role === 'isAdmin') {
                    return false;
                }
                throw new Error('unsupported'); // Make sure we only call get('isAdmin')
            }
        };

        it(' - cannot be Admin', function () {
            const result = ghUserCanAdmin([user]);
            expect(result).to.equal(false);
        });
    });
});
