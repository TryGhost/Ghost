const assert = require('node:assert/strict');
const {
  memberCountRounding,
  getMemberStats,
} = require('../../../../core/frontend/utils/member-count');

const getMemberStatsMock = [
  {
    members: 30,
    expected: '30',
  },
  {
    members: 55,
    expected: '50+',
  },
  {
    members: 580,
    expected: '550+',
  },
  {
    members: 5555,
    expected: '5,500+',
  },
  {
    members: 55555,
    expected: '55,000+',
  },
  {
    members: 555555,
    expected: '550k+',
  },
  {
    members: 5555555,
    expected: '5.5m+',
  },
];

describe('Member Count', function () {
  it('should return total members', async function () {
    const meta = {
      data: {
        meta: { totals: { paid: 1000, free: 500, comped: 500, gift: 100 } },
      },
    };
    const members = await getMemberStats.call(meta);
    assert.equal(members.total, 2100);
  });

  it('should return rounded numbers in correct format', function () {
    getMemberStatsMock.map((mock) => {
      const result = memberCountRounding(mock.members);
      return assert.equal(result, mock.expected);
    });
  });

  it('should round correctly at each range boundary', function () {
    const boundaries = [
      { members: 50, expected: '50' },
      { members: 51, expected: '50+' },
      { members: 100, expected: '100+' },
      { members: 101, expected: '100+' },
      { members: 1000, expected: '1,000+' },
      { members: 1001, expected: '1,000+' },
      { members: 10000, expected: '10,000+' },
      { members: 10001, expected: '10,000+' },
      { members: 100000, expected: '100,000+' },
      { members: 100001, expected: '100k+' },
      { members: 1000000, expected: '1m+' },
      { members: 1000001, expected: '1m+' },
    ];
    boundaries.forEach(({ members, expected }) => {
      assert.equal(memberCountRounding(members), expected, `memberCountRounding(${members})`);
    });
  });
});
