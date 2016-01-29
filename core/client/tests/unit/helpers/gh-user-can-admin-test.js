import {
    describeModule,
    it
} from 'ember-mocha';
import { ghUserCanAdmin } from 'ghost/helpers/gh-user-can-admin';

describe('Unit: Helper: gh-user-can-admin', function () {
    // Mock up roles and test for truthy
    describe('Owner role', function () {
        let user = {
            get(role) {
                if (role === 'isOwner') {
                    return true;
                } else if (role === 'isAdmin') {
                    return false;
                }
            }
        };

        it(' - can be Admin', function () {
            let result = ghUserCanAdmin([user]);
            expect(result).to.equal(true);
        });
    });

    describe('Administrator role', function () {
        let user = {
            get(role) {
                if (role === 'isOwner') {
                    return false;
                } else if (role === 'isAdmin') {
                    return true;
                }
            }
        };

        it(' - can be Admin', function () {
            let result = ghUserCanAdmin([user]);
            expect(result).to.equal(true);
        });
    });

    describe('Editor and Author roles', function () {
        let user = {
            get(role) {
                if (role === 'isOwner') {
                    return false;
                } else if (role === 'isAdmin') {
                    return false;
                }
            }
        };

        it(' - cannot be Admin', function () {
            let result = ghUserCanAdmin([user]);
            expect(result).to.equal(false);
        });
    });
});
