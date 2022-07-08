const should = require('should');
const {memberCountRounding, getMemberStats} = require('../../../../core/frontend/utils/member-count');

const getMemberStatsMock = [
    {
        members: 30,
        expected: '30'
    },
    {
        members: 55,
        expected: '50+'
    },
    {
        members: 580,
        expected: '550+'
    },
    {
        members: 5555,
        expected: '5,500+'
    },
    {
        members: 55555,
        expected: '55,000+'
    },
    {
        members: 555555,
        expected: '550k+'
    },
    {
        members: 5555555,
        expected: '5.5m+'
    }
];

describe('Member Count', function () {
    it('should return members count', async function () {
        const {free, paid, comped, total} = await getMemberStats();
        should.exist(free);
        should.exist(paid);
        should.exist(comped);
        should.exist(total);
        should.equal(total, free + paid + comped);
    });

    it('should return rounded numbers in correct format', function () {
        getMemberStatsMock.map((mock) => {
            const result = memberCountRounding(mock.members);
            return should.equal(result, mock.expected);
        });
    });
});
