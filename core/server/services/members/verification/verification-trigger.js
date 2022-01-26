const _ = require('lodash');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const config = require('../../../../shared/config');
const db = require('../../../data/db');
const models = require('../../../models');
const MembersStats = require('../stats/members-stats');

const messages = {
    emailVerificationNeeded: `We're hard at work processing your import. To make sure you get great deliverability on a list of that size, we'll need to enable some extra features for your account. A member of our team will be in touch with you by email to review your account make sure everything is configured correctly so you're ready to go.`,
    emailVerificationEmailMessage: `Email verification needed for site: {siteUrl}, just imported: {importedNumber} members.`
};

class VerificationTrigger {
    constructor({
        settingsCache,
        urlUtils,
        ghostMailer
    }) {
        this._membersStats = new MembersStats({
            settingsCache,
            db,
            isSQLite: config.get('database:client') === 'sqlite3'
        });
        this._settingsCache = settingsCache;
        this._urlUtils = urlUtils;
        this._ghostMailer = ghostMailer;
    }

    getConfigThreshold() {
        if (!this._configThreshold) {
            const threshold = _.get(config.get('hostSettings'), 'emailVerification.importThreshold');
            if (typeof threshold === 'undefined') {
                this._configThreshold = Infinity;
            } else {
                this._configThreshold = threshold;
            }
        }

        return this._configThreshold;
    }

    async getImportThreshold() {
        const volumeThreshold = this.getConfigThreshold();
        if (isFinite(volumeThreshold)) {
            const membersTotal = await this._membersStats.getTotalMembers();
            return Math.max(membersTotal, this.getConfigThreshold());
        } else {
            return volumeThreshold;
        }
    }

    /**
     * 
     * @param {object} config
     * @param {number} config.amountImported Amount of members which were imported
     * @param {boolean} config.throwOnTrigger Whether to throw if verification is needed
     * @returns {Promise<object>} Object containing property "needsVerification" - true when triggered 
     */
    async startVerificationProcess({
        amountImported,
        throwOnTrigger
    }) {
        const isVerifiedEmail = config.get('hostSettings:emailVerification:verified') === true;
        
        if ((!isVerifiedEmail)) {
            // Only trigger flag change and escalation email the first time
            if (this._settingsCache.get('email_verification_required') !== true) {
                await models.Settings.edit([{
                    key: 'email_verification_required',
                    value: true
                }], {context: {internal: true}});

                const escalationAddress = config.get('hostSettings:emailVerification:escalationAddress');
                const fromAddress = config.get('user_email');
    
                if (escalationAddress) {
                    this._ghostMailer.send({
                        subject: 'Email needs verification',
                        html: tpl(messages.emailVerificationEmailMessage, {
                            amountImported,
                            siteUrl: this._urlUtils.getSiteUrl()
                        }),
                        forceTextContent: true,
                        from: fromAddress,
                        to: escalationAddress
                    });
                }

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