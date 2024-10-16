const errors = require('@tryghost/errors');
const DomainEvents = require('@tryghost/domain-events');
const {MemberCreatedEvent} = require('@tryghost/member-events');

const messages = {
    emailVerificationNeeded: `We're hard at work processing your import. To make sure you get great deliverability, we'll need to enable some extra features for your account. A member of our team will be in touch with you by email to review your account make sure everything is configured correctly so you're ready to go.`,
    emailVerificationEmailSubject: `Email needs verification`,
    emailVerificationEmailMessageImport: `Email verification needed for site: {siteUrl}, has imported: {amountTriggered} members in the last 30 days.`,
    emailVerificationEmailMessageAdmin: `Email verification needed for site: {siteUrl} has added: {amountTriggered} members through the Admin client in the last 30 days.`,
    emailVerificationEmailMessageAPI: `Email verification needed for site: {siteUrl} has added: {amountTriggered} members through the API in the last 30 days.`
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
     * @param {(content: {subject: string, message: string, amountTriggered: number}) => Promise<void>} deps.sendVerificationEmail Sends an email to the escalation address to confirm that customer needs to be verified
     * @param {any} deps.Settings Ghost Settings model
     * @param {any} deps.eventRepository For querying events
     */
    constructor({
        getApiTriggerThreshold,
        getAdminTriggerThreshold,
        getImportTriggerThreshold,
        isVerified,
        isVerificationRequired,
        sendVerificationEmail,
        Settings,
        eventRepository
    }) {
        this._getApiTriggerThreshold = getApiTriggerThreshold;
        this._getAdminTriggerThreshold = getAdminTriggerThreshold;
        this._getImportTriggerThreshold = getImportTriggerThreshold;
        this._isVerified = isVerified;
        this._isVerificationRequired = isVerificationRequired;
        this._sendVerificationEmail = sendVerificationEmail;
        this._Settings = Settings;
        this._eventRepository = eventRepository;

        this._handleMemberCreatedEvent = this._handleMemberCreatedEvent.bind(this);
        DomainEvents.subscribe(MemberCreatedEvent, this._handleMemberCreatedEvent);
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
     * @param {MemberCreatedEvent} event
     */
    async _handleMemberCreatedEvent(event) {
        const source = event.data?.source;
        let sourceThreshold;

        if (source === 'api') {
            sourceThreshold = this._apiTriggerThreshold;
        } else if (source === 'admin') {
            sourceThreshold = this._adminTriggerThreshold;
        }

        if (['api', 'admin'].includes(source) && isFinite(sourceThreshold)) {
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - 30);
            const events = await this._eventRepository.getSignupEvents({}, {
                source: source,
                created_at: {
                    $gt: createdAt.toISOString().replace('T', ' ').substring(0, 19)
                }
            });

            const membersTotal = (await this._eventRepository.getSignupEvents({}, {
                source: 'member'
            })).meta.pagination.total;

            if (events.meta.pagination.total > Math.max(sourceThreshold, membersTotal)) {
                await this._startVerificationProcess({
                    amount: events.meta.pagination.total,
                    throwOnTrigger: false,
                    source: source
                });
            }
        }
    }

    async getImportThreshold() {
        const volumeThreshold = this._importTriggerThreshold;
        if (isFinite(volumeThreshold)) {
            const membersTotal = (await this._eventRepository.getSignupEvents({}, {
                source: 'member'
            })).meta.pagination.total;
            return Math.max(membersTotal, volumeThreshold);
        } else {
            return volumeThreshold;
        }
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
        if (!isFinite(this._importTriggerThreshold)) {
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

        const membersTotal = (await this._eventRepository.getSignupEvents({}, {
            source: 'member'
        })).meta.pagination.total;

        // Import threshold is either the total number of members (discounting any created by imports in
        // the last 30 days) or the threshold defined in config, whichever is greater.
        const importThreshold = Math.max(membersTotal - events.meta.pagination.total, this._importTriggerThreshold);
        if (isFinite(importThreshold) && events.meta.pagination.total > importThreshold) {
            await this._startVerificationProcess({
                amount: events.meta.pagination.total,
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
     * @param {boolean} config.throwOnTrigger Whether to throw if verification is needed
     * @param {string} config.source Source of the verification trigger - currently either 'api' or 'import'
     * @returns {Promise<IVerificationResult>} Object containing property "needsVerification" - true when triggered
     */
    async _startVerificationProcess({
        amount,
        throwOnTrigger,
        source
    }) {
        if (!this._isVerified()) {
            // Only trigger flag change and escalation email the first time
            if (!this._isVerificationRequired()) {
                await this._Settings.edit([{
                    key: 'email_verification_required',
                    value: true
                }], {context: {internal: true}});

                // Setting import as a default message
                let verificationMessage = messages.emailVerificationEmailMessageImport;

                if (source === 'api') {
                    verificationMessage = messages.emailVerificationEmailMessageAPI;
                } else if (source === 'admin') {
                    verificationMessage = messages.emailVerificationEmailMessageAdmin;
                }

                await this._sendVerificationEmail({
                    message: verificationMessage,
                    subject: messages.emailVerificationEmailSubject,
                    amountTriggered: amount
                });

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
        }

        return {
            needsVerification: false
        };
    }
}

module.exports = VerificationTrigger;
