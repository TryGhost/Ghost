const errors = require('@tryghost/errors');
const DomainEvents = require('@tryghost/domain-events');
const {MemberCreatedEvent} = require('../../shared/events');

const messages = {
    emailVerificationNeeded: `We're hard at work processing your import. To make sure you get great deliverability, we'll need to enable some extra features for your account. A member of our team will be in touch by email to review your account and make sure everything is configured correctly so you're ready to go.`
};

class VerificationTrigger {
    /**
     *
     * @param {object} deps
     * @param {() => number} deps.getApiTriggerThreshold Threshold for triggering API&Import sourced verifications
     * @param {() => number} deps.getAdminTriggerThreshold Threshold for triggering Admin sourced verifications
     * @param {() => number} deps.getImportTriggerThreshold Threshold for triggering Import sourced verifications
     * @param {() => boolean} deps.isVerified Check Ghost config to see if we are already verified
     * @param {() => boolean} deps.isVerificationRequired Check Ghost settings to see whether verification has been requested
     * @param {(value: boolean) => void} deps.setVerificationRequired Directly update the settings cache for email_verification_required
     * @param {(content: {amountTriggered: number, threshold: number, method: string}) => Promise<boolean>} deps.sendVerificationWebhook Sends a webhook to the escalation service to confirm that customer needs to be verified
     * @param {any} deps.Settings Ghost Settings model
     * @param {any} deps.eventRepository For querying events
     */
    constructor({
        getApiTriggerThreshold,
        getAdminTriggerThreshold,
        getImportTriggerThreshold,
        isVerified,
        isVerificationRequired,
        setVerificationRequired,
        sendVerificationWebhook,
        Settings,
        eventRepository
    }) {
        this._getApiTriggerThreshold = getApiTriggerThreshold;
        this._getAdminTriggerThreshold = getAdminTriggerThreshold;
        this._getImportTriggerThreshold = getImportTriggerThreshold;
        this._isVerified = isVerified;
        this._isVerificationRequired = isVerificationRequired;
        this._setVerificationRequired = setVerificationRequired || (() => {});
        this._sendVerificationWebhook = sendVerificationWebhook || (async () => false);
        this._Settings = Settings;
        this._eventRepository = eventRepository;

        this._handleMemberCreatedEvent = this._handleMemberCreatedEvent.bind(this);

        if (!this._isVerified()) {
            DomainEvents.subscribe(MemberCreatedEvent, this._handleMemberCreatedEvent);
        }
    }

    get _apiTriggerThreshold() {
        return this._getApiTriggerThreshold();
    }

    get _adminTriggerThreshold() {
        return this._getAdminTriggerThreshold();
    }

    get _importTriggerThreshold() {
        return this._getImportTriggerThreshold();
    }

    /**
     *
     * @param {InstanceType<typeof MemberCreatedEvent>} event
     */
    async _handleMemberCreatedEvent(event) {
        const source = event.data?.source;
        let sourceThreshold;

        if (source === 'api') {
            sourceThreshold = this._apiTriggerThreshold;
        } else if (source === 'admin') {
            sourceThreshold = this._adminTriggerThreshold;
        }

        if (['api', 'admin'].includes(source) && Number.isFinite(sourceThreshold)) {
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - 30);
            const events = await this._eventRepository.getSignupEvents({}, {
                source,
                created_at: {
                    $gt: createdAt.toISOString().replace('T', ' ').substring(0, 19)
                }
            });

            // TODO: Fix off-by-one issue in event dispatch: https://linear.app/ghost/issue/BER-3507/off-by-one-errors-in-event-query-pagination
            const addOneForCurrentEvent = events.meta.pagination.total < events.meta.pagination.limit && events.data.length !== events.meta.pagination.total;
            const currentImport = events.meta.pagination.total + (addOneForCurrentEvent ? 1 : 0);

            const membersTotal = (await this._eventRepository.getSignupEvents({}, {
                source: 'member'
            })).meta.pagination.total;

            const effectiveThreshold = Math.max(sourceThreshold, membersTotal);

            if (currentImport > effectiveThreshold) {
                await this._startVerificationProcess({
                    amount: currentImport,
                    threshold: effectiveThreshold,
                    method: source,
                    throwOnTrigger: false,
                    source: source
                });
            }
        }
    }

    async _markVerificationRequired() {
        await this._Settings.edit([{
            key: 'email_verification_required',
            value: true
        }], {context: {internal: true}});

        // Explicitly update the cache regardless of whether the DB value changed.
        // Settings.edit relies on Bookshelf's hasChanged() to fire onUpdated, which
        // skips the model event (and therefore the cache update) when the DB already
        // holds the same value — e.g. after a previous verification cycle.
        this._setVerificationRequired(true);
    }

    _finishTrigger(throwOnTrigger) {
        if (throwOnTrigger) {
            throw new errors.HostLimitError({
                message: messages.emailVerificationNeeded,
                code: 'EMAIL_VERIFICATION_NEEDED'
            });
        }

        return {
            needsVerification: true
        };
    }

    async getImportThreshold() {
        const volumeThreshold = this._importTriggerThreshold;
        if (!Number.isFinite(volumeThreshold)) {
            return volumeThreshold;
        }

        const membersTotal = (await this._eventRepository.getSignupEvents({}, {
            source: 'member'
        })).meta.pagination.total;
        return Math.max(membersTotal, volumeThreshold);
    }

    /**
     * Returns false if email verification is required to send an email. It also updates the verification check and might activate email verification.
     * Use this when sending emails.
     */
    async checkVerificationRequired() {
        // Check if import threshold is reached (could happen that a long import is in progress and we didn't check the threshold yet)
        await this.testImportThreshold();
        return this._isVerificationRequired() && !this._isVerified();
    }

    async testImportThreshold() {
        if (!Number.isFinite(this._importTriggerThreshold)) {
            // Infinite threshold, quick path
            return;
        }

        if (this._isVerified()) {
            // Already verified, no need to check limits
            return;
        }

        if (this._isVerificationRequired()) {
            // Already requested verification, no need to calculate again
            return;
        }

        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - 30);
        const events = await this._eventRepository.getSignupEvents({}, {
            source: 'import',
            created_at: {
                $gt: createdAt.toISOString().replace('T', ' ').substring(0, 19)
            }
        });

        const currentImport = events.meta.pagination.total;

        const membersTotal = (await this._eventRepository.getSignupEvents({}, {
            source: 'member'
        })).meta.pagination.total;

        // Import threshold is either the total number of members (discounting any created by imports in
        // the last 30 days) or the threshold defined in config, whichever is greater.
        const importThreshold = Math.max(membersTotal - currentImport, this._importTriggerThreshold);
        if (Number.isFinite(importThreshold) && currentImport > importThreshold) {
            await this._startVerificationProcess({
                amount: currentImport,
                threshold: importThreshold,
                method: 'import',
                throwOnTrigger: false,
                source: 'import'
            });
        }
    }

    /**
     * @typedef IVerificationResult
     * @property {boolean} needsVerification Whether the verification workflow was triggered
     */

    /**
     *
     * @param {object} config
     * @param {number} config.amount The amount of members that triggered the verification process
     * @param {number} [config.threshold] The threshold that was exceeded
     * @param {string} [config.method] The source that triggered verification - 'api', 'admin', or 'import'
     * @param {boolean} config.throwOnTrigger Whether to throw if verification is needed
     * @param {string} [config.source] Source of the verification trigger
     * @returns {Promise<IVerificationResult>} Object containing property "needsVerification" - true when triggered
     */
    async _startVerificationProcess({
        amount,
        threshold,
        method,
        throwOnTrigger,
        source
    }) {
        if (this._isVerified()) {
            return {needsVerification: false};
        }

        // Only trigger verification once.
        if (this._isVerificationRequired()) {
            return {needsVerification: false};
        }

        let webhookWasSent = false;

        try {
            webhookWasSent = await this._sendVerificationWebhook({
                amountTriggered: amount,
                threshold: threshold ?? amount,
                method: method ?? source ?? 'import'
            });
        } catch (error) {
            // `sendVerificationWebhook` already logs delivery failures.
            return {needsVerification: false};
        }

        if (!webhookWasSent) {
            return {needsVerification: false};
        }

        await this._markVerificationRequired();
        return this._finishTrigger(throwOnTrigger);
    }
}

module.exports = VerificationTrigger;
