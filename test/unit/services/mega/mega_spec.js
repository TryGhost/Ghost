const should = require('should');
const errors = require('@tryghost/errors');
const {partitionMembersBySegment} = require('../../../../core/server/services/mega/mega');

describe('MEGA', function () {
    describe('partitionMembersBySegment', function () {
        it('partition with no segments', function () {
            const members = [{
                name: 'Free Rish',
                status: 'free'
            }, {
                name: 'Free Matt',
                status: 'free'
            }, {
                name: 'Paid Daniel',
                status: 'paid'
            }];
            const segments = [];

            const partitions = partitionMembersBySegment(members, segments);

            partitions.unsegmented.length.should.equal(3);
            partitions.unsegmented[0].name.should.equal('Free Rish');
        });

        it('partition members with single segment', function () {
            const members = [{
                name: 'Free Rish',
                status: 'free'
            }, {
                name: 'Free Matt',
                status: 'free'
            }, {
                name: 'Paid Daniel',
                status: 'paid'
            }];
            const segments = ['status:free'];

            const partitions = partitionMembersBySegment(members, segments);

            should.exist(partitions['status:free']);
            partitions['status:free'].length.should.equal(2);
            partitions['status:free'][0].name.should.equal('Free Rish');
            partitions['status:free'][1].name.should.equal('Free Matt');

            should.exist(partitions.unsegmented);
            partitions.unsegmented.length.should.equal(1);
            partitions.unsegmented[0].name.should.equal('Paid Daniel');
        });

        it('partition members with two segments', function () {
            const members = [{
                name: 'Free Rish',
                status: 'free'
            }, {
                name: 'Free Matt',
                status: 'free'
            }, {
                name: 'Paid Daniel',
                status: 'paid'
            }];
            const segments = ['status:free', 'status:-free'];

            const partitions = partitionMembersBySegment(members, segments);

            should.exist(partitions['status:free']);
            partitions['status:free'].length.should.equal(2);
            partitions['status:free'][0].name.should.equal('Free Rish');
            partitions['status:free'][1].name.should.equal('Free Matt');

            should.exist(partitions['status:-free']);
            partitions['status:-free'].length.should.equal(1);
            partitions['status:-free'][0].name.should.equal('Paid Daniel');

            should.not.exist(partitions.unsegmented);
        });

        it('throws if unsupported segment has been used', function () {
            const members = [];

            const segments = ['not a valid segment'];

            should.throws(() => {
                partitionMembersBySegment(members, segments);
            }, errors.ValidationError);
        });
    });
});
