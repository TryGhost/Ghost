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

/**
 * @typedef {import('./SlackNotificationsService').ISlackNotifications} ISlackNotifications
 */

/**
 * @implements {ISlackNotifications}
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
        // TODO: read those values from somewhere maybe?
        const hasImportedMembers = 'has imported members';
        const lastEmailTooSoon = 'last email too recent';
        const reason = hasImportedMembers || lastEmailTooSoon;
        const currentArr = this.#getFormattedAmount({amount: 598.76, currency: milestone?.currency});
        const currentMembers = this.#getFormattedAmount({amount: 9857});

        // TODO: clean this up!
        const slackWebhookUrl = this.#config.get('hostSettings')?.milestones?.url;
        const milestoneTypePretty = milestone.type === 'arr' ? 'ARR' : 'Members';
        const valueFormatted = this.#getFormattedAmount({amount: milestone.value, currency: milestone?.currency});

        const emailSent = milestone.emailSentAt ? this.#getFormattedDate(milestone?.emailSentAt) : `no / ${reason}`;
        const siteUrl = this.#getSiteUrl();
        const title = `${milestoneTypePretty} Milestone ${valueFormatted} reached!`;

        const arrSection = {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*Milestone:*\n${valueFormatted}`
                },
                {
                    type: 'mrkdwn',
                    text: `*Current ARR:*\n${currentArr}`
                }
            ]
        };

        const membersSection = {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*Milestone:*\n${valueFormatted}`
                },
                {
                    type: 'mrkdwn',
                    text: `*Current Members:*\n${currentMembers}`
                }
            ]
        };

        const valueSection = milestone.type === 'arr' ? arrSection : membersSection;

        const blocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `New *${milestoneTypePretty} Milestone* achieved for <https://${siteUrl}|https://${siteUrl}>`
                }
            },
            valueSection,
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Email sent:*\n${emailSent}`
                }
            }
        ];

        const slackData = {
            text: title,
            unfurl_links: false,
            username: 'Ghost Milestone Service',
            blocks
        };

        await this.send(slackData, slackWebhookUrl);
    }

    /**
     *
     * @param {object} slackData
     * @param {URL} url
     *
     * @returns {Promise<any>}
     */
    async send(slackData, url) {
        if (!url || typeof url !== 'string' || !validator.isURL(url)) {
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

    /**
     * @returns {string}
     */
    #getSiteUrl() {
        const [, siteDomain] = this.#urlUtils.getSiteUrl()
            .match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));

        return siteDomain;
    }

    /**
     * @param {object} options
     * @param {number} options.amount
     * @param {string} [options.currency]
     *
     * @returns {string}
     */
    #getFormattedAmount({amount = 0, currency}) {
        if (!currency) {
            return Intl.NumberFormat().format(amount);
        }

        return Intl.NumberFormat('en', {
            style: 'currency',
            currency,
            currencyDisplay: 'symbol'
        }).format(amount);
    }

    /**
     * @param {string|Date} date
     *
     * @returns {string}
     */
    #getFormattedDate(date) {
        if (!date) {
            return '';
        }

        return moment(date).format('D MMM YYYY');
    }
}

module.exports = SlackNotifications;
