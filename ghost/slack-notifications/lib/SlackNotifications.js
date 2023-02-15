const got = require('got');
const validator = require('@tryghost/validator');
const errors = require('@tryghost/errors');
const ghostVersion = require('@tryghost/version');
const moment = require('moment');

/**
 * @typedef {object} config
 * @property {(string) => any} get
 */

/**
 * @typedef {object} urlUtils
 * @property {() => string} getSiteUrl
 */

class SlackNotifications {
    /** @type {config} */
    #config;

    /** @type {urlUtils} */
    #urlUtils;

    /** @type {import('@tryghost/logging')} */
    #logging;

    /**
     * @param {object} deps
     * @param {config} deps.config
     * @param {urlUtils} deps.urlUtils
     * @param {import('@tryghost/logging')} deps.logging
     */
    constructor(deps) {
        this.#urlUtils = deps.urlUtils;
        this.#config = deps.config;
        this.#logging = deps.logging;
    }

    /**
     * @param {import('@tryghost/milestones/lib/InMemoryMilestoneRepository').Milestone} milestone
     *
     * @returns {Promise<void>}
     */
    async notifyMilestoneReceived(milestone) {
        const hostSettings = this.#config.get('hostSettings');
        const slackWebhookUrl = hostSettings?.milestones?.url;

        const milestoneType = milestone.type === 'arr' ? 'ARR' : 'Members';
        const valueFormatted = this.#getFormattedAmount({amount: milestone.value, currency: milestone?.currency});
        const hasImportedMembers = false;
        const lastEmailTooSoon = false;
        const reason = hasImportedMembers || lastEmailTooSoon;
        const emailSent = milestone.emailSentAt ? this.#getFormattedDate(milestone.emailSentAt) : `no / ${reason}`;
        const siteUrl = this.#getSiteUrl();
        const title = `${milestoneType} Milestone ${milestone.value} reached!`;
        const arrSection = {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*Milestone:*\n${valueFormatted}`
                },
                {
                    type: 'mrkdwn',
                    text: '*Current ARR:*\n$598.76'
                }
            ]
        };

        const membersSection = {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: '*Members:*\n'
                },
                {
                    type: 'mrkdwn',
                    text: '*Current Members:*\n9,857'
                }
            ]
        };

        const valueSection = milestone.type === 'arr' ? arrSection : membersSection;

        const blocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `New *ARR Milestone* achieved for <${siteUrl}|${siteUrl}>`
                }
            },
            valueSection,
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Email sent:*\n${emailSent} / has imported members`
                }
            }
        ];

        const slackData = {
            text: title,
            unfurl_links: false,
            username: 'Ghost Milestone Service',
            blocks
        };

        await this.#send(slackData, slackWebhookUrl);
    }

    async #send(slackData, url) {
        if (!url || !validator.isURL(url)) {
            const err = new errors.InternalServerError({
                message: 'URL empty or invalid.',
                code: 'URL_MISSING_INVALID',
                context: url
            });

            return this.#logging.error(err);
        }

        const requestOptions = {
            body: JSON.stringify(slackData),
            headers: {
                'user-agent': 'Ghost/' + ghostVersion.original + ' (https://github.com/TryGhost/Ghost)'
            }
        };

        return await got(url, requestOptions);
    }

    #getSiteUrl() {
        const [, siteDomain] = this.#urlUtils.getSiteUrl()
            .match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));

        return siteDomain;
    }

    #getFormattedAmount({amount = 0, currency}) {
        if (!currency) {
            return '';
        }

        return Intl.NumberFormat('en', {
            style: 'currency',
            currency,
            currencyDisplay: 'symbol'
        }).format(amount);
    }

    #getFormattedDate(date) {
        if (!date) {
            return '';
        }

        return moment(date).format('D MMM YYYY');
    }
}

module.exports = SlackNotifications;
