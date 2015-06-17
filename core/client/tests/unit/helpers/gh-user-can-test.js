import {
    describeModule,
    it
} from 'ember-mocha';
import {
    ghUserCan
} from 'ghost/helpers/gh-user-can';

describe ('GhUserCanHelper', function () {
    // Mock up roles and test for truthy
    describe ('Owner role', function () {
        var user = {get: function (role) {
                if (role === 'isOwner') {
                    return true;
                } else if (role === 'isAdmin') {
                    return false;
                } else if (role === 'isEditor') {
                    return false;
                }
            }
        };
        it(' - can be Admin', function () {
            var result = ghUserCan([user, 'admin']);
            expect(result).to.equal(true);
        });
        it(' - can be Editor', function () {
            var result = ghUserCan([user, 'editor']);
            expect(result).to.equal(true);
        });
    });

    describe ('Administrator role', function () {
        var user = {
            get: function (role) {
                if (role === 'isOwner') {
                    return false;
                } else if (role === 'isAdmin') {
                    return true;
                } else if (role === 'isEditor') {
                    return false;
                }
            }
        };
        it(' - can be Admin', function () {
            var result = ghUserCan([user, 'admin']);
            expect(result).to.equal(true);
        });
        it(' - can be Editor', function () {
            var result = ghUserCan([user, 'editor']);
            expect(result).to.equal(true);
        });
    });

    describe ('Editor role', function () {
        var user = {
            get: function (role) {
                if (role === 'isOwner') {
                    return false;
                } else if (role === 'isAdmin') {
                    return false;
                } else if (role === 'isEditor') {
                    return true;
                }
            }
        };
        it(' - cannot be Admin', function () {
            var result = ghUserCan([user, 'admin']);
            expect(result).to.equal(false);
        });
        it(' - can be Editor', function () {
            var result = ghUserCan([user, 'editor']);
            expect(result).to.equal(true);
        });
    });

    describe ('Author role', function () {
        var user = {
            get: function (role) {
                if (role === 'isOwner') {
                    return false;
                } else if (role === 'isAdmin') {
                    return false;
                } else if (role === 'isEditor') {
                    return false;
                }
            }
        };
        it(' - cannot be Admin', function () {
            var result = ghUserCan([user, 'admin']);
            expect(result).to.equal(false);
        });
        it(' - cannot be Editor', function () {
            var result = ghUserCan([user, 'editor']);
            expect(result).to.equal(false);
        });
    });
});
