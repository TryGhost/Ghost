import moment from 'moment-timezone';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {mostRecentlyUpdated} from 'ghost-admin/helpers/most-recently-updated';

describe('Unit: Helper: most-recently-updated', function () {
    it('returns most recent - updatedAtUTC', function () {
        const a = {updatedAtUTC: moment.utc('2022-03-04 16:10')};
        const b = {updatedAtUTC: moment.utc('2022-03-03 16:10')};
        const c = {updatedAtUTC: moment.utc('2022-03-04 16:20')};

        const subs = [a, b, c];

        expect(mostRecentlyUpdated(subs)).to.equal(c);
    });

    it('returns most recent - updatedAt', function () {
        const a = {updatedAt: moment('2022-03-04 16:10')};
        const b = {updatedAt: moment('2022-03-05 16:10')};
        const c = {updatedAt: moment('2022-03-04 16:20')};

        const subs = [a, b, c];

        expect(mostRecentlyUpdated(subs)).to.equal(b);
    });

    it('returns most recent - updated_at', function () {
        const a = {updated_at: '2022-03-04 16:10'};
        const b = {updated_at: '2022-03-03 16:10'};
        const c = {updated_at: '2022-03-04 16:20'};

        const subs = [a, b, c];

        expect(mostRecentlyUpdated(subs)).to.equal(c);
    });

    it('handles a single-element array', function () {
        const a = {updated_at: '2022-02-22'};

        expect(mostRecentlyUpdated([a])).to.equal(a);
    });

    it('handles null', function () {
        expect(mostRecentlyUpdated(null)).to.equal(null);
    });

    it('handles empty array', function () {
        expect(mostRecentlyUpdated([])).to.equal(null);
    });

    it('does not modify original array', function () {
        const a = {updated_at: '2022-03-04 16:10'};
        const b = {updated_at: '2022-03-03 16:10'};
        const c = {updated_at: '2022-03-04 16:20'};

        const subs = [a, b, c];

        mostRecentlyUpdated(subs);

        expect(subs[0]).to.equal(a);
        expect(subs[1]).to.equal(b);
        expect(subs[2]).to.equal(c);
    });
});
