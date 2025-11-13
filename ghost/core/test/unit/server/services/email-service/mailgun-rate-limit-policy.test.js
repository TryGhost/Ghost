const MailgunRateLimitPolicy = require('../../../../../core/server/services/email-service/MailgunRateLimitPolicy');
const sinon = require('sinon');
const should = require('should');
const assert = require('assert/strict');

describe('Mailgun Rate Limit Policy', function () {
    let clock;
    let config;

    beforeEach(function () {
        clock = sinon.useFakeTimers(new Date('2025-01-15T10:00:00.000Z'));

        config = {
            get: sinon.stub()
        };
    });

    afterEach(function () {
        clock.restore();
        sinon.restore();
    });

    describe('constructor', function () {
        it('loads default tiers when no config provided', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});
            const tier = policy.getTier();

            should(tier).be.an.Object();
            should(tier.batchSize).eql(1000);
            should(tier.maxConcurrentBatches).eql(2);
        });

        it('uses pro tier as default', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});
            const tier = policy.getTier();

            should(tier.perDay).eql(1000000);
            should(tier.batchSize).eql(1000);
        });

        it('loads custom tier from config', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('starter');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});
            const tier = policy.getTier();

            should(tier.perDay).eql(100);
            should(tier.perHour).eql(100);
            should(tier.batchSize).eql(100);
            should(tier.maxConcurrentBatches).eql(1);
        });

        it('merges custom tier definitions', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('custom');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns({
                custom: {
                    batchSize: 500,
                    maxConcurrentBatches: 3,
                    perDay: 5000
                }
            });

            const policy = new MailgunRateLimitPolicy({config});
            const tier = policy.getTier();

            should(tier.batchSize).eql(500);
            should(tier.maxConcurrentBatches).eql(3);
            should(tier.perDay).eql(5000);
        });

        it('falls back to pro tier for invalid tier name', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('invalid-tier');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});
            const tier = policy.getTier();

            should(tier.perDay).eql(1000000);
        });
    });

    describe('getBatchSize', function () {
        it('returns batch size from current tier', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('flex');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            should(policy.getBatchSize()).eql(500);
        });
    });

    describe('getMaxConcurrentBatches', function () {
        it('returns max concurrent batches from current tier', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('starter');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            should(policy.getMaxConcurrentBatches()).eql(1);
        });
    });

    describe('getBatchDelayMs', function () {
        it('returns 0 when no delay configured', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            should(policy.getBatchDelayMs()).eql(0);
        });

        it('returns configured delay', function () {
            config.get.withArgs('bulkEmail:mailgun:batchDelayMs').returns(2000);

            const policy = new MailgunRateLimitPolicy({config});

            should(policy.getBatchDelayMs()).eql(2000);
        });
    });

    describe('acquireSlot', function () {
        it('allows sending when within all limits', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('starter');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});
            const result = policy.acquireSlot(50);

            should(result.canSend).be.true();
            should(result.readyAt).be.null();
            should(result.reason).be.null();
        });

        it('blocks sending when daily limit would be exceeded', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('starter');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            // Send 80 emails
            policy.recordSent(80);

            // Try to send 30 more (would exceed 100/day limit)
            const result = policy.acquireSlot(30);

            should(result.canSend).be.false();
            should(result.reason).match(/Daily limit/);
            should(result.readyAt).be.a.Date();
            // Should be ready tomorrow
            should(result.readyAt.getDate()).eql(16);
        });

        it('blocks sending when hourly limit would be exceeded', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('flex');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            // Send 900 emails
            policy.recordSent(900);

            // Try to send 200 more (would exceed 1000/hour limit)
            const result = policy.acquireSlot(200);

            should(result.canSend).be.false();
            should(result.reason).match(/Per-hour limit/);
            should(result.readyAt).be.a.Date();
            // Should be ready next hour
            should(result.readyAt.getHours()).eql(11);
        });

        it('blocks sending when in cooldown', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('pro');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            // Register a rate limit hit
            policy.registerLimitHit({
                retryAfterSeconds: 3600,
                limitType: 'hour',
                errorMessage: 'Rate limit exceeded'
            });

            // Try to send
            const result = policy.acquireSlot(100);

            should(result.canSend).be.false();
            should(result.reason).eql('Rate limit exceeded');
        });

        it('allows sending after cooldown expires', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('pro');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            // Register a rate limit hit with 1 hour cooldown
            policy.registerLimitHit({
                retryAfterSeconds: 3600,
                limitType: 'hour',
                errorMessage: 'Rate limit exceeded'
            });

            // Advance time by 1 hour
            clock.tick(3600 * 1000);

            // Try to send
            const result = policy.acquireSlot(100);

            should(result.canSend).be.true();
        });
    });

    describe('recordSent', function () {
        it('updates all window counters', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            policy.recordSent(100);

            const state = policy.getState();
            should(state.sentInCurrentMinute).eql(100);
            should(state.sentInCurrentHour).eql(100);
            should(state.sentInCurrentDay).eql(100);
        });

        it('accumulates multiple sends', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            policy.recordSent(50);
            policy.recordSent(30);
            policy.recordSent(20);

            const state = policy.getState();
            should(state.sentInCurrentDay).eql(100);
        });

        it('resets minute counter after 60 seconds', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            policy.recordSent(100);

            // Advance time by 60 seconds
            clock.tick(60 * 1000);

            policy.recordSent(50);

            const state = policy.getState();
            should(state.sentInCurrentMinute).eql(50);
            should(state.sentInCurrentHour).eql(150);
            should(state.sentInCurrentDay).eql(150);
        });

        it('resets hour counter after 1 hour', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            policy.recordSent(100);

            // Advance time by 1 hour
            clock.tick(3600 * 1000);

            policy.recordSent(50);

            const state = policy.getState();
            should(state.sentInCurrentMinute).eql(50);
            should(state.sentInCurrentHour).eql(50);
            should(state.sentInCurrentDay).eql(150);
        });

        it('resets day counter after 24 hours', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            policy.recordSent(100);

            // Advance time by 24 hours
            clock.tick(24 * 3600 * 1000);

            policy.recordSent(50);

            const state = policy.getState();
            should(state.sentInCurrentMinute).eql(50);
            should(state.sentInCurrentHour).eql(50);
            should(state.sentInCurrentDay).eql(50);
        });
    });

    describe('registerLimitHit', function () {
        it('sets cooldown using retryAfterSeconds', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            const result = policy.registerLimitHit({
                retryAfterSeconds: 1800,
                limitType: 'hour',
                errorMessage: 'Hourly limit exceeded'
            });

            should(result.cooldownUntil).be.a.Date();
            should(result.reason).eql('Hourly limit exceeded');

            const state = policy.getState();
            should(state.coolingDown).be.true();
            should(state.cooldownReason).eql('Hourly limit exceeded');
        });

        it('calculates cooldown for minute limit without retryAfter', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            const result = policy.registerLimitHit({
                limitType: 'minute',
                errorMessage: 'Per-minute limit exceeded'
            });

            // Should wait until next minute
            const cooldownMs = result.cooldownUntil - new Date();
            should(cooldownMs).be.within(0, 60 * 1000);
        });

        it('calculates cooldown for hour limit without retryAfter', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            const result = policy.registerLimitHit({
                limitType: 'hour',
                errorMessage: 'Per-hour limit exceeded'
            });

            // Should wait until next hour
            const cooldownMs = result.cooldownUntil - new Date();
            should(cooldownMs).be.within(0, 3600 * 1000);
        });

        it('calculates cooldown for day limit without retryAfter', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            const result = policy.registerLimitHit({
                limitType: 'day',
                errorMessage: 'Daily limit exceeded'
            });

            // Should wait until next day
            const cooldownMs = result.cooldownUntil - new Date();
            should(cooldownMs).be.within(0, 24 * 3600 * 1000);
            should(result.cooldownUntil.getDate()).eql(16); // Next day
        });
    });

    describe('resetCooldown', function () {
        it('clears cooldown period', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            policy.registerLimitHit({
                retryAfterSeconds: 3600,
                limitType: 'hour',
                errorMessage: 'Rate limit exceeded'
            });

            let state = policy.getState();
            should(state.coolingDown).be.true();

            policy.resetCooldown();

            state = policy.getState();
            should(state.coolingDown).be.false();
            should(state.cooldownUntil).be.null();
            should(state.cooldownReason).be.null();
        });

        it('does nothing if not in cooldown', function () {
            config.get.returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            // Should not throw
            policy.resetCooldown();

            const state = policy.getState();
            should(state.coolingDown).be.false();
        });
    });

    describe('getRemainingCapacity', function () {
        it('returns full capacity when nothing sent', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('starter');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            const capacity = policy.getRemainingCapacity();

            should(capacity.minute).be.null(); // starter tier has no per-minute limit
            should(capacity.hour).eql(100);
            should(capacity.day).eql(100);
        });

        it('returns reduced capacity after sending', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('flex');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            policy.recordSent(250);

            const capacity = policy.getRemainingCapacity();

            should(capacity.hour).eql(750);
            should(capacity.day).eql(4750);
        });

        it('returns null for unlimited windows', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('pro');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});

            const capacity = policy.getRemainingCapacity();

            should(capacity.minute).be.null();
            should(capacity.hour).be.null();
            should(capacity.day).eql(1000000);
        });
    });

    describe('tier configurations', function () {
        it('starter tier has correct limits', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('starter');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});
            const tier = policy.getTier();

            should(tier.batchSize).eql(100);
            should(tier.maxConcurrentBatches).eql(1);
            should(tier.perHour).eql(100);
            should(tier.perDay).eql(100);
        });

        it('flex tier has correct limits', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('flex');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});
            const tier = policy.getTier();

            should(tier.batchSize).eql(500);
            should(tier.maxConcurrentBatches).eql(2);
            should(tier.perHour).eql(1000);
            should(tier.perDay).eql(5000);
        });

        it('foundation tier has correct limits', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('foundation');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});
            const tier = policy.getTier();

            should(tier.batchSize).eql(1000);
            should(tier.maxConcurrentBatches).eql(2);
            should(tier.perHour).eql(10000);
            should(tier.perDay).eql(50000);
        });

        it('growth tier has correct limits', function () {
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tier').returns('growth');
            config.get.withArgs('bulkEmail:mailgun:rateLimit:tiers').returns(undefined);

            const policy = new MailgunRateLimitPolicy({config});
            const tier = policy.getTier();

            should(tier.batchSize).eql(1000);
            should(tier.maxConcurrentBatches).eql(2);
            should(tier.perHour).eql(50000);
            should(tier.perDay).eql(200000);
        });
    });
});
