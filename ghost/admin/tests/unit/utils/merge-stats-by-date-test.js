import mergeStatsByDate from 'ghost-admin/utils/merge-stats-by-date';
import {describe, it} from 'mocha';
import {expect} from 'chai';

const STATS_DATA = [
    {
        date: '2024-06-22',
        tier: '111111111111111111111111',
        cadence: 'month',
        positive_delta: 0,
        negative_delta: 0,
        signups: 0,
        cancellations: 0,
        count: 456
    },
    {
        date: '2024-06-22',
        tier: '111111111111111111111111',
        cadence: 'year',
        positive_delta: 1,
        negative_delta: 1,
        signups: 0,
        cancellations: 0,
        count: 1354
    },
    {
        date: '2024-06-23',
        tier: '111111111111111111111111',
        cadence: 'month',
        positive_delta: 0,
        negative_delta: 0,
        signups: 0,
        cancellations: 0,
        count: 456
    },
    {
        date: '2024-06-23',
        tier: '111111111111111111111111',
        cadence: 'year',
        positive_delta: 1,
        negative_delta: 1,
        signups: 0,
        cancellations: 0,
        count: 1354
    },
    {
        date: '2024-06-23',
        tier: '111111111111111111111113',
        cadence: 'year',
        positive_delta: 0,
        negative_delta: 0,
        signups: 0,
        cancellations: 0,
        count: 400
    },
    {
        date: '2024-06-24',
        tier: '111111111111111111111111',
        cadence: 'year',
        positive_delta: 3,
        negative_delta: 2,
        signups: 1,
        cancellations: 0,
        count: 1355
    },
    {
        date: '2024-06-24',
        tier: '111111111111111111111113',
        cadence: 'year',
        positive_delta: 2,
        negative_delta: 1,
        signups: 2,
        cancellations: 1,
        count: 401
    },
    {
        date: '2024-06-24',
        tier: '111111111111111111111112',
        cadence: 'year',
        positive_delta: 1,
        negative_delta: 0,
        signups: 1,
        cancellations: 0,
        count: 55
    },
    {
        date: '2024-06-25',
        tier: '111111111111111111111111',
        cadence: 'month',
        positive_delta: 0,
        negative_delta: 1,
        signups: 0,
        cancellations: 1,
        count: 455
    },
    {
        date: '2024-06-25',
        tier: '111111111111111111111111',
        cadence: 'year',
        positive_delta: 2,
        negative_delta: 5,
        signups: 1,
        cancellations: 4,
        count: 1352
    },
    {
        date: '2024-06-25',
        tier: '111111111111111111111113',
        cadence: 'year',
        positive_delta: 1,
        negative_delta: 2,
        signups: 1,
        cancellations: 2,
        count: 400
    },
    {
        date: '2024-06-26',
        tier: '111111111111111111111111',
        cadence: 'year',
        positive_delta: 2,
        negative_delta: 2,
        signups: 0,
        cancellations: 0,
        count: 1352
    },
    {
        date: '2024-06-26',
        tier: '111111111111111111111113',
        cadence: 'year',
        positive_delta: 0,
        negative_delta: 0,
        signups: 0,
        cancellations: 0,
        count: 400
    }
];

describe('mergeStatsByDate', function () {
    it('merges stats as expected', function () {
        const result = mergeStatsByDate(STATS_DATA);
        expect(result).to.deep.equal([
            {
                date: '2024-06-22',
                count: 1810,
                positiveDelta: 1,
                negativeDelta: 1,
                signups: 0,
                cancellations: 0
            },
            {
                date: '2024-06-23',
                count: 2210,
                positiveDelta: 1,
                negativeDelta: 1,
                signups: 0,
                cancellations: 0
            },
            {
                date: '2024-06-24',
                count: 1811,
                positiveDelta: 6,
                negativeDelta: 3,
                signups: 4,
                cancellations: 1
            },
            {
                date: '2024-06-25',
                count: 2207,
                positiveDelta: 3,
                negativeDelta: 8,
                signups: 2,
                cancellations: 7
            },
            {
                date: '2024-06-26',
                count: 1752,
                positiveDelta: 2,
                negativeDelta: 2,
                signups: 0,
                cancellations: 0
            }
        ]);
    });
});
