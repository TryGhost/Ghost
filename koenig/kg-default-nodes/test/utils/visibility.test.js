const {utils} = require('../../');
const {usesOldVisibilityFormat, migrateOldVisibilityFormat} = utils.visibility;

describe('Utils: visibility', function () {
    describe('usesOldVisibilityFormat', function () {
        it('returns true if visibility object does not have web property', function () {
            const visibility = {showOnWeb: true, email: {memberSegment: 'status:free,status:-free'}};
            usesOldVisibilityFormat(visibility).should.be.true();
        });

        it('returns true if visibility object does not have email property', function () {
            const visibility = {web: {nonMember: true, memberSegment: 'status:free,status:-free'}, showOnEmail: true};
            usesOldVisibilityFormat(visibility).should.be.true();
        });

        it('returns true if web object is missing nonMember property', function () {
            const visibility = {web: {memberSegment: 'status:free,status:-free'}, email: {memberSegment: 'status:free,status:-free'}};
            usesOldVisibilityFormat(visibility).should.be.true();
        });
    });

    describe('migrateOldVisibilityFormat', function () {
        it('creates new web property from showOnWeb:false', function () {
            const visibility = {showOnWeb: false};
            migrateOldVisibilityFormat(visibility);
            visibility.web.should.eql({nonMember: false, memberSegment: ''});
        });

        it('creates new web property from showOnWeb:true', function () {
            const visibility = {showOnWeb: true};
            migrateOldVisibilityFormat(visibility);
            visibility.web.should.eql({nonMember: true, memberSegment: 'status:free,status:-free'});
        });

        it('creates new email property from showOnEmail: false', function () {
            const visibility = {showOnEmail: false, segment: 'status:free'};
            migrateOldVisibilityFormat(visibility);
            visibility.email.should.eql({memberSegment: ''});
        });

        it('creates new email property from showOnEmail: true, segment:""', function () {
            const visibility = {showOnEmail: true, segment: ''};
            migrateOldVisibilityFormat(visibility);
            visibility.email.should.eql({memberSegment: 'status:free,status:-free'});
        });

        it('creates new email property from showOnEmail: true, segment:"status:free"', function () {
            const visibility = {showOnEmail: true, segment: 'status:free'};
            migrateOldVisibilityFormat(visibility);
            visibility.email.should.eql({memberSegment: 'status:free'});
        });

        it('leaves existing properties alone', function () {
            const visibility = {showOnWeb: true, segment: 'status:free'};
            migrateOldVisibilityFormat(visibility);
            visibility.showOnWeb.should.be.true();
            visibility.segment.should.eql('status:free');
        });
    });
});
