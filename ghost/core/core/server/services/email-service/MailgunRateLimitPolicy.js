const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');

const messages = {
    rateLimitExceeded: 'Email sending rate limit exceeded. Sending will resume automatically at {resumeAt}.',
    tierNotFound: 'Rate limit tier "{tier}" not found in configuration.'
};

/**
 * @typedef {Object} RateLimitTier
 * @property {number} batchSize - Maximum number of emails per batch
 * @property {number} maxConcurrentBatches - Maximum number of concurrent batches
 * @property {number} [perMinute] - Maximum emails per minute
 * @property {number} [perHour] - Maximum emails per hour
 * @property {number} perDay - Maximum emails per day
 * @property {Object} [rampUp] - Ramp-up configuration for new accounts
 * @property {number} [rampUp.startPerDay] - Initial daily limit for new accounts
 * @property {number} [rampUp.increment] - Daily limit increment
 * @property {number} [rampUp.intervalHours] - Hours between increments
 */

/**
 * @typedef {Object} RateLimitState
 * @property {number} sentInCurrentMinute - Emails sent in current minute
 * @property {number} sentInCurrentHour - Emails sent in current hour
 * @property {number} sentInCurrentDay - Emails sent in current day
 * @property {Date} minuteStart - Start of current minute window
 * @property {Date} hourStart - Start of current hour window
 * @property {Date} dayStart - Start of current day window
 * @property {boolean} coolingDown - Whether in cooldown period
 * @property {Date|null} cooldownUntil - When cooldown ends
 * @property {string|null} cooldownReason - Reason for cooldown
 */

/**
 * Manages rate limiting for email sending through Mailgun
 * Supports configurable tiers with different batch sizes and rate limits
 */
class MailgunRateLimitPolicy {
    #config;
    #state;
    #tiers;
    #currentTier;
    #store;

    /**
     * Default tier definitions matching current Ghost behavior
     */
    static DEFAULT_TIERS = {
        starter: {
            batchSize: 100,
            maxConcurrentBatches: 1,
            perHour: 100,
            perDay: 100,
            rampUp: {
                startPerDay: 100,
                increment: 100,
                intervalHours: 24
            }
        },
        flex: {
            batchSize: 500,
            maxConcurrentBatches: 2,
            perHour: 1000,
            perDay: 5000
        },
        foundation: {
            batchSize: 1000,
            maxConcurrentBatches: 2,
            perHour: 10000,
            perDay: 50000
        },
        growth: {
            batchSize: 1000,
            maxConcurrentBatches: 2,
            perHour: 50000,
            perDay: 200000
        },
        pro: {
            batchSize: 1000,
            maxConcurrentBatches: 2,
            // No per-minute/hour limits for pro tier
            perDay: 1000000
        },
        custom: {
            batchSize: 1000,
            maxConcurrentBatches: 2,
            perDay: 10000000 // Effectively unlimited
        }
    };

    /**
     * @param {Object} options
     * @param {Object} options.config - Ghost config object
     * @param {Object} [options.store] - Optional external store (Redis) for multi-instance support
     */
    constructor({config, store}) {
        this.#config = config;
        this.#store = store;

        // Load tier definitions from config or use defaults
        const configTiers = this.#config.get('bulkEmail:mailgun:rateLimit:tiers');
        this.#tiers = configTiers ? {...MailgunRateLimitPolicy.DEFAULT_TIERS, ...configTiers} : MailgunRateLimitPolicy.DEFAULT_TIERS;

        // Get current tier from config
        const tierName = this.#config.get('bulkEmail:mailgun:rateLimit:tier') || 'pro';
        this.#setTier(tierName);

        // Initialize state
        this.#resetState();
    }

    /**
     * Set the current rate limit tier
     * @private
     * @param {string} tierName
     */
    #setTier(tierName) {
        if (!this.#tiers[tierName]) {
            logging.warn(tpl(messages.tierNotFound, {tier: tierName}));
            tierName = 'pro'; // Fallback to pro tier
        }

        this.#currentTier = this.#tiers[tierName];
        logging.info(`Mailgun rate limit tier set to: ${tierName}`, this.#currentTier);
    }

    /**
     * Reset rate limit state
     * @private
     */
    #resetState() {
        const now = new Date();
        this.#state = {
            sentInCurrentMinute: 0,
            sentInCurrentHour: 0,
            sentInCurrentDay: 0,
            minuteStart: now,
            hourStart: now,
            dayStart: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            coolingDown: false,
            cooldownUntil: null,
            cooldownReason: null
        };
    }

    /**
     * Update time windows and reset counters if windows have expired
     * @private
     */
    #updateWindows() {
        const now = new Date();

        // Reset minute window
        if (now - this.#state.minuteStart >= 60000) {
            this.#state.sentInCurrentMinute = 0;
            this.#state.minuteStart = new Date(Math.floor(now.getTime() / 60000) * 60000);
        }

        // Reset hour window
        if (now - this.#state.hourStart >= 3600000) {
            this.#state.sentInCurrentHour = 0;
            this.#state.hourStart = new Date(Math.floor(now.getTime() / 3600000) * 3600000);
        }

        // Reset day window
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dayStart > this.#state.dayStart) {
            this.#state.sentInCurrentDay = 0;
            this.#state.dayStart = dayStart;
        }

        // Check if cooldown has expired
        if (this.#state.coolingDown && now >= this.#state.cooldownUntil) {
            this.#state.coolingDown = false;
            this.#state.cooldownUntil = null;
            this.#state.cooldownReason = null;
            logging.info('Mailgun rate limit cooldown period ended');
        }
    }

    /**
     * Get the current tier configuration
     * @returns {RateLimitTier}
     */
    getTier() {
        return this.#currentTier;
    }

    /**
     * Get the maximum batch size for current tier
     * @returns {number}
     */
    getBatchSize() {
        return this.#currentTier.batchSize;
    }

    /**
     * Get the maximum concurrent batches for current tier
     * @returns {number}
     */
    getMaxConcurrentBatches() {
        return this.#currentTier.maxConcurrentBatches;
    }

    /**
     * Get the minimum delay between batches in milliseconds
     * @returns {number}
     */
    getBatchDelayMs() {
        return this.#config.get('bulkEmail:mailgun:batchDelayMs') || 0;
    }

    /**
     * Check if we can send a batch of the specified size
     * @param {number} batchSize - Number of emails to send
     * @returns {{canSend: boolean, readyAt: Date|null, reason: string|null}}
     */
    acquireSlot(batchSize) {
        this.#updateWindows();

        // Check if in cooldown
        if (this.#state.coolingDown) {
            return {
                canSend: false,
                readyAt: this.#state.cooldownUntil,
                reason: this.#state.cooldownReason
            };
        }

        const tier = this.#currentTier;

        // If batch size exceeds the smallest rate limit, allow it to send anyway
        // Otherwise it would be stuck in infinite retry
        const smallestLimit = Math.min(
            tier.perMinute || Infinity,
            tier.perHour || Infinity,
            tier.perDay
        );
        if (batchSize > smallestLimit) {
            logging.warn(`Batch size ${batchSize} exceeds smallest rate limit ${smallestLimit}. Allowing send to prevent infinite retry.`);
            // Still check if we have any capacity at all - don't send if current window is already full
            if (this.#state.sentInCurrentMinute >= (tier.perMinute || Infinity) ||
                this.#state.sentInCurrentHour >= (tier.perHour || Infinity) ||
                this.#state.sentInCurrentDay >= tier.perDay) {
                // Wait for the earliest window that will reset
                let readyAt;
                if (tier.perMinute && this.#state.sentInCurrentMinute >= tier.perMinute) {
                    readyAt = new Date(this.#state.minuteStart.getTime() + 60000);
                } else if (tier.perHour && this.#state.sentInCurrentHour >= tier.perHour) {
                    readyAt = new Date(this.#state.hourStart.getTime() + 3600000);
                } else {
                    readyAt = new Date(this.#state.dayStart.getTime() + 86400000);
                }
                return {
                    canSend: false,
                    readyAt,
                    reason: `Batch size ${batchSize} exceeds limit, waiting for fresh window`
                };
            }
            // Allow oversized batch to send in fresh window
            return {
                canSend: true,
                readyAt: null,
                reason: null
            };
        }

        // Check per-minute limit
        if (tier.perMinute) {
            if (this.#state.sentInCurrentMinute + batchSize > tier.perMinute) {
                const readyAt = new Date(this.#state.minuteStart.getTime() + 60000);
                return {
                    canSend: false,
                    readyAt,
                    reason: `Per-minute limit of ${tier.perMinute} would be exceeded`
                };
            }
        }

        // Check per-hour limit
        if (tier.perHour) {
            if (this.#state.sentInCurrentHour + batchSize > tier.perHour) {
                const readyAt = new Date(this.#state.hourStart.getTime() + 3600000);
                return {
                    canSend: false,
                    readyAt,
                    reason: `Per-hour limit of ${tier.perHour} would be exceeded`
                };
            }
        }

        // Check per-day limit
        if (this.#state.sentInCurrentDay + batchSize > tier.perDay) {
            const readyAt = new Date(this.#state.dayStart.getTime() + 86400000);
            return {
                canSend: false,
                readyAt,
                reason: `Daily limit of ${tier.perDay} would be exceeded`
            };
        }

        return {
            canSend: true,
            readyAt: null,
            reason: null
        };
    }

    /**
     * Record that a batch was successfully sent
     * @param {number} batchSize - Number of emails sent
     */
    recordSent(batchSize) {
        this.#updateWindows();

        this.#state.sentInCurrentMinute += batchSize;
        this.#state.sentInCurrentHour += batchSize;
        this.#state.sentInCurrentDay += batchSize;

        logging.debug(`Recorded ${batchSize} emails sent. Current counts: minute=${this.#state.sentInCurrentMinute}, hour=${this.#state.sentInCurrentHour}, day=${this.#state.sentInCurrentDay}`);
    }

    /**
     * Register a rate limit hit from the provider
     * @param {Object} options
     * @param {number} [options.retryAfterSeconds] - Seconds to wait before retry (from Retry-After header)
     * @param {string} [options.limitType] - Type of limit hit (minute/hour/day)
     * @param {string} [options.errorMessage] - Error message from provider
     * @returns {{cooldownUntil: Date, reason: string}}
     */
    registerLimitHit({retryAfterSeconds, limitType, errorMessage}) {
        const now = new Date();

        // Use Retry-After if provided, otherwise use intelligent defaults
        let cooldownMs;
        if (retryAfterSeconds) {
            cooldownMs = retryAfterSeconds * 1000;
        } else if (limitType === 'minute') {
            // Wait until next minute
            cooldownMs = 60000 - (now.getTime() % 60000);
        } else if (limitType === 'hour') {
            // Wait until next hour
            cooldownMs = 3600000 - (now.getTime() % 3600000);
        } else {
            // Wait until next day for daily limits
            const tomorrow = new Date(this.#state.dayStart.getTime() + 86400000);
            cooldownMs = tomorrow - now;
        }

        const cooldownUntil = new Date(now.getTime() + cooldownMs);
        const reason = errorMessage || `Rate limit exceeded (${limitType || 'unknown'})`;

        this.#state.coolingDown = true;
        this.#state.cooldownUntil = cooldownUntil;
        this.#state.cooldownReason = reason;

        logging.warn(`Mailgun rate limit hit: ${reason}. Cooling down until ${cooldownUntil.toISOString()}`);

        return {
            cooldownUntil,
            reason
        };
    }

    /**
     * Reset the cooldown period (for manual intervention)
     */
    resetCooldown() {
        if (this.#state.coolingDown) {
            logging.info('Manually resetting Mailgun rate limit cooldown');
            this.#state.coolingDown = false;
            this.#state.cooldownUntil = null;
            this.#state.cooldownReason = null;
        }
    }

    /**
     * Get current rate limit state for monitoring/debugging
     * @returns {RateLimitState}
     */
    getState() {
        this.#updateWindows();
        return {...this.#state};
    }

    /**
     * Get remaining capacity for current windows
     * @returns {{minute: number|null, hour: number|null, day: number}}
     */
    getRemainingCapacity() {
        this.#updateWindows();

        const tier = this.#currentTier;

        return {
            minute: tier.perMinute ? tier.perMinute - this.#state.sentInCurrentMinute : null,
            hour: tier.perHour ? tier.perHour - this.#state.sentInCurrentHour : null,
            day: tier.perDay - this.#state.sentInCurrentDay
        };
    }
}

module.exports = MailgunRateLimitPolicy;
