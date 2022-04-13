const errors = require('@tryghost/errors');
const DomainEvents = require('@tryghost/domain-events');
const {MemberSubscribeEvent} = require('@tryghost/member-events');

const messages = {
    emailVerificationNeeded: `We're hard at work processing your import. To make sure you get great deliverability on a list of that size, we'll need to enable some extra features for your account. A member of our team will be in touch with you by email to review your account make sure everything is configured correctly so you're ready to go.`,
    emailVerificationEmailSubject: `Email needs verification`,
    emailVerificationEmailMessageImport: `Email verification needed for site: {siteUrl}, has imported: {importedNumber} members in the last 30 days.`,
    emailVerificationEmailMessageAPI: `Email verification needed for site: {siteUrl} has added: {importedNumber} members through the API in the last 30 days.`
};

class VerificationTrigger {
    /**
     *
     * @param {object} deps
     * @param {number} deps.configThreshold Threshold for triggering verification as defined in config
     * @param {() => boolean} deps.isVerified Check Ghost config to see if we are already verified
     * @param {() => boolean} deps.isVerificationRequired Check Ghost settings to see whether verification has been requested
     * @param {(content: {subject: string, message: string, amountImported: number}) => {}} deps.sendVerificationEmail Sends an email to the escalation address to confirm that customer needs to be verified
     * @param {any} deps.membersStats MemberStats service
     * @param {any} deps.Settings Ghost Settings model
     * @param {any} deps.eventRepository For querying events
     */
    constructor({
        configThreshold,
        isVerified,
        isVerificationRequired,
        sendVerificationEmail,
        membersStats,
        Settings,
        eventRepository
    }) {
        this._configThreshold = configThreshold;
        this._isVerified = isVerified;
        this._isVerificationRequired = isVerificationRequired;
        this._sendVerificationEmail = sendVerificationEmail;
        this._membersStats = membersStats;
        this._Settings = Settings;
        this._eventRepository = eventRepository;

        DomainEvents.subscribe(MemberSubscribeEvent, async (event) => {
            if (event.data.source === 'api' && isFinite(this._configThreshold)) {
                const createdAt = new Date();
                createdAt.setDate(createdAt.getDate() - 30);
                const events = await this._eventRepository.getNewsletterSubscriptionEvents({}, {
                    'data.source': `data.source:'api'`,
                    'data.created_at': `data.created_at:>'${createdAt.toISOString().replace('T', ' ').substring(0, 19)}'`
                });

                if (events.meta.pagination.total > this._configThreshold) {
                    await this.startVerificationProcess({
                        amountImported: events.meta.pagination.total,
                        throwOnTrigger: false,
                        source: 'api'
                    });
                }
            }
        });
    }

    async getImportThreshold() {
        const volumeThreshold = this._configThreshold;
        if (isFinite(volumeThreshold)) {
            const membersTotal = await this._membersStats.getTotalMembers();
            return Math.max(membersTotal, volumeThreshold);
        } else {
            return volumeThreshold;
        }
    }

    async testImportThreshold() {
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - 30);
        const events = await this._eventRepository.getNewsletterSubscriptionEvents({}, {
            'data.source': `data.source:'import'`,
            'data.created_at': `data.created_at:>'${createdAt.toISOString().replace('T', ' ').substring(0, 19)}'`
        });

        if (!isFinite(this._configThreshold)) {
            // Inifinte threshold, quick path
            return;
        }

        const membersTotal = await this._membersStats.getTotalMembers();

        // Import threshold is either the total number of members (discounting any created by imports in
        // the last 30 days) or the threshold defined in config, whichever is greater.
        const importThreshold = Math.max(membersTotal - events.meta.pagination.total, this._configThreshold);
        if (isFinite(importThreshold) && events.meta.pagination.total > importThreshold) {
            await this.startVerificationProcess({
                amountImported: events.meta.pagination.total,
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
     * @param {number} config.amountImported Amount of members which were imported
     * @param {boolean} config.throwOnTrigger Whether to throw if verification is needed
     * @param {string} config.source Source of the verification trigger - currently either 'api' or 'import'
     * @returns {Promise<IVerificationResult>} Object containing property "needsVerification" - true when triggered
     */
    async startVerificationProcess({
        amountImported,
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

                this._sendVerificationEmail({
                    message: source === 'api'
                        ? messages.emailVerificationEmailMessageAPI
                        : messages.emailVerificationEmailMessageImport,
                    subject: messages.emailVerificationEmailSubject,
                    amountImported
                });

                if (throwOnTrigger) {
                    throw new errors.ValidationError({
                        message: messages.emailVerificationNeeded
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
