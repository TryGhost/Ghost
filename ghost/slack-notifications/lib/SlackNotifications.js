const got = require('got');
const validator = require('@tryghost/validator');
const errors = require('@tryghost/errors');
const ghostVersion = require('@tryghost/version');

/**
 * @typedef {object} slackField
 * @property {string} slackField.title
 * @property {string} slackField.value
 * @property {boolean} slackField.short
 */

/**
 * @typedef {object} slackAttachment
 * @property {string} slackAttachment.fallback
 * @property {string} slackAttachment.title
 * @property {string} slackAttachment.color
 * @property {Array.<slackField>} slackAttachment.fields
 */

/**
 * @typedef {object} slackData
 * @property {string} slackData.username
 * @property {string} slackData.text
 * @property {Array.<slackAttachment>} slackData.attachments
 */

/**
 * @typedef {object} slackOptions
 * @property {boolean} slackOptions.unfurl
 * @property {URL} slackOptions.iconUrl
 */

/**
 * @typedef {object} events
 * @property {(string, Function) => void} on
 */

module.exports = class SlackNotifications {
    /** @type {Array.<string>} */
    #eventTypes = ['slack.test']; // default event to listen to

    /** @type {events} */
    #events;

    /** @type {URL} */
    #url;

    /** @type {slackData} */
    #slackData;

    /** @type {slackOptions} */
    #slackOptions;

    constructor(deps) {
        this.#eventTypes = deps.eventTypes ?? this.#eventTypes;
        this.#events = deps.events;
        this.#slackOptions = deps.slackOptions;
        this.#url = deps.url;
        this.#slackData = deps.slackData;
    }

    /**
     * @param {Array.<string>} eventTypes
     */
    addEventTypes(eventTypes) {
        for (const eventType of eventTypes) {
            if (!this.#eventTypes.includes(eventType)) {
                this.#eventTypes.push(eventType);
            }
        }

        // update listen
        this.listen();
    }

    listener(data) {
        this.processEventData(data);
    }

    async #send(slackData) {
        if (!this.#url || !validator.isURL(this.#url)) {
            throw new errors.InternalServerError({
                message: 'URL empty or invalid.',
                code: 'URL_MISSING_INVALID',
                context: this.#url
            });
        }

        const requestOptions = {
            body: JSON.stringify(slackData),
            headers: {
                'user-agent': 'Ghost/' + ghostVersion.original + ' (https://github.com/TryGhost/Ghost)'
            }
        };

        return await got(this.#url, requestOptions);
    }

    async listen() {
        for (const eventType of this.#eventTypes) {
            this.#events.on(eventType, this.listener.bind(this));
        }
    }

    async processEventData(data) {
        const slackConfig = {
            milestones: {
                arr: {
                    color: '#ff0000'
                },
                members: {

                }
            }
        };
        console.log('🤖 → processEventData → data', data);
        console.log('🤖 → listener → this', this.#slackData);

        if (this.#slackData?.attachments) {
            this.#slackData?.attachments.map((attachment) => {
                attachment.fallback = attachment.fallback.replace('<%fallback%>', data.fallback);
                attachment.title = attachment.title.replace('<%title%>', data.title);
                attachment.color = attachment.color.replace('<%color%>', data.color);
                if (attachment.fields?.length) {
                    attachment.fields.map((field) => {
                        field.title = field.title.replace('<%title%>', data.fieldTitle);
                        field.value = field.value.replace('<%value%>', data.fieldValue);
                        return field;
                    });
                }
                return attachment;
            });
        }

        // TODO: check if we need to fetch additional data or receive it from the event
        const slackData = {
            text: this.#slackData.text,
            unfurl_links: this.#slackOptions.unfurl,
            icon_url: this.#slackOptions.iconUrl,
            username: this.#slackData.username,
            attachments: this.#slackData?.attachments
        };

        return await this.#send(slackData);
    }
};
