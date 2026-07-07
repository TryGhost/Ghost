const logging = require('@tryghost/logging');
const {GiftBookshelfRepository} = require('./gift-bookshelf-repository');
const {GiftService} = require('./gift-service');
const {GiftReminderScheduler} = require('./gift-reminder-scheduler');
const {GiftEmailService} = require('./gift-email-service');
const {GiftController} = require('./gift-controller');
const {SubscriptionActivatedEvent} = require('../../../shared/events');
const StartGiftReminderFlushEvent = require('./events/start-gift-reminder-flush-event');
const StartGiftCleanupEvent = require('./events/start-gift-cleanup-event');
const jobs = require('./jobs');
const {GhostMailer} = require('../mail');
const EmailAddressParser = require('../email-address/email-address-parser');
const {blogIcon} = require('../../lib/image');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.domainEvents
 * @param {object} deps.settingsCache
 * @param {object} deps.urlUtils
 * @param {object} deps.settingsHelpers
 * @param {object} deps.tiers
 * @param {object} deps.staff
 * @param {object} deps.membersService
 * @param {(key: string) => string} deps.t
 */
module.exports = function createGiftService({models, domainEvents, settingsCache, urlUtils, settingsHelpers, tiers, staff, membersService, t}) {
    let initialized = false;

    const wrapper = {
        service: null,
        controller: null,
        /**
         * @param {{apiUrl?: string, schedulerAdapter?: object, internalKeys?: object}} [options]
         */
        async init(options = {}) {
            if (initialized) {
                return;
            }
            initialized = true;

            const repository = new GiftBookshelfRepository({
                GiftModel: models.Gift
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

            const service = new GiftService({
                giftRepository: repository,
                get memberRepository() {
                    return membersService.api.members;
                },
                tiersService: tiers,
                giftEmailService,
                get staffServiceEmails() {
                    return staff.api.emails;
                },
                giftReminderScheduler
            });

            wrapper.service = service;
            wrapper.controller = new GiftController({
                service,
                tiersService: tiers
            });

            domainEvents.subscribe(SubscriptionActivatedEvent, async (event) => {
                try {
                    const gift = await service.getActiveByMember(event.data.memberId);

                    if (!gift) {
                        return;
                    }

                    await service.consume(gift.token);
                } catch (err) {
                    logging.error(err, 'Failed to consume gift on paid subscription activation');
                }
            });

            domainEvents.subscribe(StartGiftReminderFlushEvent, async () => {
                const start = Date.now();
                try {
                    const {remindedCount, skippedCount, failedCount} = await service.processReminders();

                    logging.info(`Sent ${remindedCount} gift reminders, skipped ${skippedCount}, failed ${failedCount} in ${Date.now() - start}ms`);
                } catch (err) {
                    logging.error(err, 'Failed to process gift reminders');
                }
            });

            domainEvents.subscribe(StartGiftCleanupEvent, async () => {
                const consumedStart = Date.now();
                try {
                    const {consumedCount, updatedMemberCount} = await service.processConsumed();

                    logging.info(`Consumed ${consumedCount} gifts, updated ${updatedMemberCount} members in ${Date.now() - consumedStart}ms`);
                } catch (err) {
                    logging.error(err, 'Failed to process consumed gifts');
                }

                const expiredStart = Date.now();
                try {
                    const {expiredCount} = await service.processExpired();

                    logging.info(`Expired ${expiredCount} gifts in ${Date.now() - expiredStart}ms`);
                } catch (err) {
                    logging.error(err, 'Failed to process expired gifts');
                }
            });

            jobs.scheduleGiftCleanupJob();
            jobs.scheduleGiftReminderJob();
        }
    };

    return wrapper;
};
