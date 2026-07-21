/**
 * @typedef {object} SchedulerAdapter
 * @prop {(job: {time: number; url: string; extra: {httpMethod: string}}) => void} schedule
 */

/**
 * @typedef {object} InitOptions
 * @prop {string} [apiUrl]
 * @prop {SchedulerAdapter} [schedulerAdapter]
 * @prop {import('../internal-keys').InternalKeys} [internalKeys]
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
        const {GiftReminderScheduler} = require('./gift-reminder-scheduler');
        const {GiftDeliveryScheduler} = require('./gift-delivery-scheduler');
        const {GiftEmailService} = require('./gift-email-service');
        const {GiftController} = require('./gift-controller');
        const membersService = require('../members');
        const tiersService = require('../tiers');
        const staffService = require('../staff');
        const DomainEvents = require('@tryghost/domain-events');
        const logging = require('@tryghost/logging');
        const {SubscriptionActivatedEvent} = require('../../../shared/events');
        const StartGiftReminderFlushEvent = require('./events/start-gift-reminder-flush-event');
        const StartGiftDeliveryFlushEvent = require('./events/start-gift-delivery-flush-event');
        const StartGiftCleanupEvent = require('./events/start-gift-cleanup-event');
        const jobs = require('./jobs');

        const {GhostMailer} = require('../mail');
        const settingsCache = require('../../../shared/settings-cache');
        const urlUtils = require('../../../shared/url-utils');
        const settingsHelpers = require('../settings-helpers');
        const EmailAddressParser = require('../email-address/email-address-parser');
        const {blogIcon} = require('../../../server/lib/image');
        const {t} = require('../i18n');

        const repository = new GiftBookshelfRepository({
            GiftModel
        });

        const giftEmailService = new GiftEmailService({
            mailer: new GhostMailer(),
            settingsCache,
            urlUtils,
            getFromAddress: () => EmailAddressParser.stringify(settingsHelpers.getDefaultEmail()),
            blogIcon,
            t
        });

        const giftReminderScheduler = new GiftReminderScheduler({
            apiUrl: options.apiUrl,
            adapter: options.schedulerAdapter,
            internalKeys: options.internalKeys,
            findUnsentReminders: () => repository.findUnsentReminders()
        });

        const giftDeliveryScheduler = new GiftDeliveryScheduler({
            apiUrl: options.apiUrl,
            adapter: options.schedulerAdapter,
            internalKeys: options.internalKeys,
            findUnsentDeliveries: () => repository.findUnsentDeliveries()
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
            giftReminderScheduler,
            giftDeliveryScheduler
        });

        this.controller = new GiftController({
            service: this.service,
            tiersService
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
            const start = Date.now();
            try {
                const {remindedCount, skippedCount, failedCount} = await this.service.processReminders();

                logging.info(`Sent ${remindedCount} gift reminders, skipped ${skippedCount}, failed ${failedCount} in ${Date.now() - start}ms`);
            } catch (err) {
                logging.error(err, 'Failed to process gift reminders');
            }
        });

        DomainEvents.subscribe(StartGiftDeliveryFlushEvent, async () => {
            const start = Date.now();
            try {
                const {deliveredCount, skippedCount, failedCount} = await this.service.processDeliveries();

                logging.info(`Sent ${deliveredCount} gift deliveries, skipped ${skippedCount}, failed ${failedCount} in ${Date.now() - start}ms`);
            } catch (err) {
                logging.error(err, 'Failed to process gift deliveries');
            }
        });

        DomainEvents.subscribe(StartGiftCleanupEvent, async () => {
            const consumedStart = Date.now();
            try {
                const {consumedCount, updatedMemberCount} = await this.service.processConsumed();

                logging.info(`Consumed ${consumedCount} gifts, updated ${updatedMemberCount} members in ${Date.now() - consumedStart}ms`);
            } catch (err) {
                logging.error(err, 'Failed to process consumed gifts');
            }

            const expiredStart = Date.now();
            try {
                const {expiredCount} = await this.service.processExpired();

                logging.info(`Expired ${expiredCount} gifts in ${Date.now() - expiredStart}ms`);
            } catch (err) {
                logging.error(err, 'Failed to process expired gifts');
            }
        });

        jobs.scheduleGiftCleanupJob();
        jobs.scheduleGiftReminderJob();
        jobs.scheduleGiftDeliveryJob();

        this.#initialized = true;
    }
}

module.exports = GiftServiceWrapper;
