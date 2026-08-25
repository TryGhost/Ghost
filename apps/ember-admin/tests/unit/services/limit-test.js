import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit | Service | limit', function () {
    setupTest();

    let limitService;

    beforeEach(function () {
        limitService = this.owner.lookup('service:limit');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('exists', function () {
        expect(limitService).to.be.ok;
    });

    describe('loadLimits', function () {
        it('registers a periodic limit when a subscription start is configured', function () {
            limitService.config.hostSettings = {
                subscription: {start: '2026-01-01T00:00:00.000Z'},
                limits: {emails: {maxPeriodic: 100}}
            };

            limitService.loadLimits();

            expect(limitService.limiter.isLimited('emails')).to.be.true;
        });

        // Without a subscription the limit service throws, which aborts the loop
        // registering limits and leaves Admin with none of them
        it('skips a periodic limit rather than throwing when no subscription is configured', function () {
            limitService.config.hostSettings = {
                limits: {emails: {maxPeriodic: 100}}
            };

            expect(() => limitService.loadLimits()).to.not.throw();
            expect(limitService.limiter.isLimited('emails')).to.be.false;
        });

        // A subscription with no start can't anchor a period; building one anyway
        // throws on the missing start date and leaves the count query without one
        it('skips a periodic limit when the subscription has no start date', function () {
            limitService.config.hostSettings = {
                subscription: {},
                limits: {emails: {maxPeriodic: 100}}
            };

            expect(() => limitService.loadLimits()).to.not.throw();
            expect(limitService.limiter.isLimited('emails')).to.be.false;
        });

        it('still registers limits declared after an unusable periodic limit', function () {
            limitService.config.hostSettings = {
                limits: {
                    emails: {maxPeriodic: 100},
                    customThemes: {allowlist: ['casper']}
                }
            };

            limitService.loadLimits();

            expect(limitService.limiter.isLimited('emails')).to.be.false;
            expect(limitService.limiter.isLimited('customThemes')).to.be.true;
        });
    });

    describe('getEmailsCount', function () {
        it('sums recipients of emails sent since the start of the period', async function () {
            const query = sinon.stub().resolves([
                {emailCount: 30},
                {emailCount: 12}
            ]);
            limitService.set('store', {query});

            const count = await limitService.getEmailsCount(undefined, '2026-01-01T00:00:00.000Z');

            expect(count).to.equal(42);
            expect(query.firstCall.args[0]).to.equal('email');
            expect(query.firstCall.args[1].filter).to.equal(`created_at:>='2026-01-01T00:00:00.000Z'`);
            // emails carry their full html and plaintext bodies, which this has no use for
            expect(query.firstCall.args[1].fields).to.equal('id,email_count');
        });

        it('counts nothing when no emails were sent in the period', async function () {
            limitService.set('store', {query: sinon.stub().resolves([])});

            expect(await limitService.getEmailsCount(undefined, '2026-01-01T00:00:00.000Z')).to.equal(0);
        });
    });
});
