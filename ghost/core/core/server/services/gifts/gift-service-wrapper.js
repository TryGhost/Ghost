/**
 * @typedef {object} SchedulerAdapter
 * @prop {(job: {time: number; url: string; extra: {httpMethod: string}}) => void} schedule
 */

/**
 * @typedef {object} SchedulerIntegration
 * @prop {Array<{id: string; secret: string}>} api_keys
 */

/**
 * @typedef {object} InitOptions
 * @prop {string} [apiUrl]
 * @prop {SchedulerAdapter} [schedulerAdapter]
 * @prop {SchedulerIntegration} [schedulerIntegration]
 */

class GiftServiceWrapper {
    controller;
    service;
    #initialized = false;

    /**
     * @param {InitOptions} [options]
     */
    async init(options = {}) {
        if (this.#initialized) {
            return;
        }

        const {Gift: GiftModel} = require('../../models');
        const {GiftBookshelfRepository} = require('./gift-bookshelf-repository');
        const {GiftService} = require('./gift-service');
        const {GiftEmailService} = require('./gift-email-service');
        const {GiftController} = require('./gift-controller');
        const membersService = require('../members');
        const tiersService = require('../tiers');
        const staffService = require('../staff');
        const labsService = require('../../../shared/labs');
        const DomainEvents = require('@tryghost/domain-events');
        const logging = require('@tryghost/logging');
        const {SubscriptionActivatedEvent} = require('../../../shared/events');
        const StartGiftReminderFlushEvent = require('./events/start-gift-reminder-flush-event');

        const {GhostMailer} = require('../mail');
        const settingsCache = require('../../../shared/settings-cache');
        const urlUtils = require('../../../shared/url-utils');
        const settingsHelpers = require('../settings-helpers');
        const EmailAddressParser = require('../email-address/email-address-parser');
        const {blogIcon} = require('../../../server/lib/image');
        const {getSignedAdminToken} = require('../../adapters/scheduling/utils');

        const repository = new GiftBookshelfRepository({
            GiftModel
        });

        const giftEmailService = new GiftEmailService({
            mailer: new GhostMailer(),
            settingsCache,
            urlUtils,
            getFromAddress: () => EmailAddressParser.stringify(settingsHelpers.getDefaultEmail()),
            blogIcon
        });

        this.service = new GiftService({
            giftRepository: repository,
            get memberRepository() {
                return membersService.api.members;
            },
            tiersService,
            giftEmailService,
            get staffServiceEmails() {
                return staffService.api.emails;
            },
            schedulerAdapter: options.schedulerAdapter ?? null,
            schedulerIntegration: options.schedulerIntegration ?? null,
            getSignedAdminToken,
            urlJoin: urlUtils.urlJoin.bind(urlUtils),
            apiUrl: options.apiUrl ?? null
        });

        this.controller = new GiftController({
            service: this.service,
            tiersService,
            labsService: labsService
        });

        DomainEvents.subscribe(SubscriptionActivatedEvent, async (event) => {
            try {
                const gift = await this.service.getActiveByMember(event.data.memberId);

                if (!gift) {
                    return;
                }

                await this.service.consume(gift.token);
            } catch (err) {
                logging.error(err, 'Failed to consume gift on paid subscription activation');
            }
        });

        DomainEvents.subscribe(StartGiftReminderFlushEvent, async () => {
            try {
                await this.service.processReminders();
            } catch (err) {
                logging.error(err, 'Failed to flush gift reminders');
            }
        });

        this.#initialized = true;
    }
}

module.exports = GiftServiceWrapper;
