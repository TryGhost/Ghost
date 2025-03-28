import {describe, it} from 'mocha';
import {expect} from 'chai';
import {mostRelevantSubscription} from 'ghost-admin/helpers/most-relevant-subscription';

describe('Unit: Helper: most-relevant-subscription', function () {
    it('returns active subscriptions first', function () {
        const active = {id: 'a', status: 'active', current_period_end: '2022-03-04 16:10'};
        const canceled = {id: 'b', status: 'canceled', current_period_end: '2022-03-04 16:10'};

        const subs = [active, canceled];

        expect(mostRelevantSubscription(subs)).to.equal(active);
    });

    it('returns the subscription with the latest current_period_end', function () {
        const older = {id: 'a', status: 'active', current_period_end: '2022-03-04 16:10'};
        const latest = {id: 'b', status: 'active', current_period_end: '2022-03-04 16:20'};

        const subs = [older, latest];

        expect(mostRelevantSubscription(subs)).to.equal(latest);
    });

    it('ignores comped subscriptions', function () {
        const normal = {id: 'a', status: 'active', current_period_end: '2022-03-04 16:10'};
        const comped = {id: null, status: 'active', current_period_end: '2022-03-04 16:20'};

        const subs = [normal, comped];

        expect(mostRelevantSubscription(subs)).to.equal(normal);
    });

    it('handles null or invalid dates', function () {
        const a = {id: 'a', status: 'active', current_period_end: '2022-03-04 16:10'};
        const b = {id: 'b', status: 'active', current_period_end: '2022-03-04 16:20'};
        const c = {id: 'c', status: 'active', current_period_end: ''};
        const d = {id: 'd', status: 'active', current_period_end: null};
        const e = {id: 'e', status: 'active', current_period_end: 'string'};

        const subs = [a, b, c, d, e];

        expect(mostRelevantSubscription(subs)).to.equal(b);
    });

    it('handles a single-element array', function () {
        const a = {id: 'a', current_period_end: '2022-02-22'};

        expect(mostRelevantSubscription([a])).to.equal(a);
    });

    it('handles null', function () {
        expect(mostRelevantSubscription(null)).to.equal(null);
    });

    it('handles empty array', function () {
        expect(mostRelevantSubscription([])).to.equal(null);
    });

    it('does not modify original array', function () {
        const a = {id: 'a', status: 'active', current_period_end: '2022-03-04 16:10'};
        const b = {id: 'b', status: 'canceled', current_period_end: '2022-03-04 16:10'};
        const c = {id: null, status: 'active', current_period_end: '2022-03-04 16:10'};

        const subs = [a, b, c];

        mostRelevantSubscription(subs);

        expect(subs[0]).to.equal(a);
        expect(subs[1]).to.equal(b);
        expect(subs[2]).to.equal(c);
    });
});
