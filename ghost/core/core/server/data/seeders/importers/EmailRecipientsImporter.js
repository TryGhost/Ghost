const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const generateEvents = require('../utils/event-generator');
const dateToDatabaseString = require('../utils/database-date');
const debug = require('@tryghost/debug')('EmailRecipientsImporter');

const emailStatus = {
    delivered: Symbol(),
    opened: Symbol(),
    failed: Symbol(),
    none: Symbol()
};

function findFirstHigherIndex(arr, target) {
    let start = 0;
    let end = arr.length - 1;
    let result = -1;

    while (start <= end) {
        let mid = Math.floor((start + end) / 2);

        if (arr[mid] >= target) {
            result = mid;
            end = mid - 1; // Continue searching in the left half
        } else {
            start = mid + 1; // Continue searching in the right half
        }
    }

    return result; // Return -1 if no element is higher than target
}

class EmailRecipientsImporter extends TableImporter {
    static table = 'email_recipients';
    static dependencies = ['emails', 'email_batches', 'members', 'members_subscribe_events'];

    constructor(knex, transaction) {
        super(EmailRecipientsImporter.table, knex, transaction);
    }

    async import(quantity) {
        if (quantity === 0) {
            return;
        }

        const now = Date.now();
        const emails = await this.transaction
            .select(
                'id',
                'newsletter_id',
                'email_count',
                'delivered_count',
                'opened_count',
                'failed_count')
            .from('emails');
        this.emails = new Map();

        for (const email of emails) {
            this.emails.set(email.id, email);
        }

        this.emailBatches = await this.transaction.select('id', 'email_id', 'updated_at').from('email_batches').orderBy('email_id');
        const members = await this.transaction.select('id', 'uuid', 'email', 'name').from('members');
        this.membersSubscribeEvents = await this.transaction.select('id', 'newsletter_id', 'created_at', 'member_id').from('members_subscribe_events').orderBy('created_at', 'asc'); // Order required for better performance in setReferencedModel

        // Create a map for fast lookups
        this.members = new Map();
        for (const member of members) {
            this.members.set(member.id, member);
        }

        // Save indexes of each batch for performance (remarkable faster than doing findIndex on each generate call)
        let lastEmailId = null;
        let lastIndex = 0;
        for (const batch of this.emailBatches) {
            if (batch.email_id !== lastEmailId) {
                lastIndex = 0;
                lastEmailId = batch.email_id;
            }
            batch.index = lastIndex;
            lastIndex += 1;
        }

        // Now reorder by email id

        debug (`Prepared data for ${this.name} in ${Date.now() - now}ms`);

        // We use the same event curve for all emails to speed up the generation
        // Spread over 14 days
        this.eventStartTimeUsed = new Date();
        const endTime = new Date(this.eventStartTimeUsed.getTime() + 1000 * 60 * 60 * 24 * 14);
        this.eventCurve = generateEvents({
            shape: 'ease-out',
            trend: 'negative',
            total: 1000,
            startTime: this.eventStartTimeUsed,
            endTime
        });

        this.membersSubscribeEventsByNewsletterId = new Map();
        this.membersSubscribeEventsCreatedAtsByNewsletterId = new Map();
        for (const memberSubscribeEvent of this.membersSubscribeEvents) {
            if (!this.membersSubscribeEventsByNewsletterId.has(memberSubscribeEvent.newsletter_id)) {
                this.membersSubscribeEventsByNewsletterId.set(memberSubscribeEvent.newsletter_id, []);
            }
            this.membersSubscribeEventsByNewsletterId.get(memberSubscribeEvent.newsletter_id).push(memberSubscribeEvent);

            if (!this.membersSubscribeEventsCreatedAtsByNewsletterId.has(memberSubscribeEvent.newsletter_id)) {
                this.membersSubscribeEventsCreatedAtsByNewsletterId.set(memberSubscribeEvent.newsletter_id, []);
            }

            if (!(memberSubscribeEvent.created_at instanceof Date)) {
                // SQLite fix
                memberSubscribeEvent.created_at = new Date(memberSubscribeEvent.created_at);
            }
            this.membersSubscribeEventsCreatedAtsByNewsletterId.get(memberSubscribeEvent.newsletter_id).push(memberSubscribeEvent.created_at.getTime());
        }

        await this.importForEach(this.emailBatches, quantity ? quantity / emails.length : 1000);
    }

    setReferencedModel(model) {
        this.batch = model;
        this.model = this.emails.get(this.batch.email_id);
        this.batchIndex = this.batch.index;

        // Shallow clone members list so we can shuffle and modify it
        const earliestOpenTime = new Date(this.batch.updated_at);
        const latestOpenTime = new Date(this.batch.updated_at);
        latestOpenTime.setDate(latestOpenTime.getDate() + 14);

        // Get all members that were subscribed to this newsletter BEFORE the batch was sent
        // We use binary search to speed up it up
        const lastIndex = findFirstHigherIndex(this.membersSubscribeEventsCreatedAtsByNewsletterId.get(this.model.newsletter_id), earliestOpenTime);

        this.membersList = this.membersSubscribeEventsByNewsletterId.get(this.model.newsletter_id).slice(0, Math.max(0, lastIndex - 1))
            .slice(this.batchIndex * 1000, (this.batchIndex + 1) * 1000)
            .map(memberSubscribeEvent => memberSubscribeEvent.member_id);

        this.events = faker.helpers.shuffle(this.eventCurve.slice(0, this.membersList.length));
        this.eventIndex = 0;

        this.emailMeta = {
            // delievered and not opened
            deliveredCount: this.model.delivered_count - this.model.opened_count,
            openedCount: this.model.opened_count,
            failedCount: this.model.failed_count
        };

        let offset = this.batchIndex * 1000;

        // We always first create the failures, then the opened, then the delivered, so we need to remove those from the meta so we don't generate them multiple times
        this.emailMeta = {
            failedCount: Math.max(0, this.emailMeta.failedCount - offset),
            openedCount: Math.max(0, this.emailMeta.openedCount - Math.max(0, offset - this.emailMeta.failedCount)),
            deliveredCount: Math.max(0, this.emailMeta.deliveredCount - Math.max(0, offset - this.emailMeta.failedCount - this.emailMeta.openedCount))
        };
    }

    generate() {
        let timestamp = this.events.pop();
        if (!timestamp) {
            return;
        }

        // The events are generated for a different time, so we need to move them to the batch time
        timestamp = new Date(timestamp.getTime() - this.eventStartTimeUsed.getTime() + new Date(this.batch.updated_at).getTime());

        if (timestamp > new Date()) {
            timestamp = new Date();
        }

        const memberId = this.membersList[this.events.length];
        const member = this.members.get(memberId);

        let status = emailStatus.none;
        if (this.emailMeta.failedCount > 0) {
            status = emailStatus.failed;
            this.emailMeta.failedCount -= 1;
        } else if (this.emailMeta.openedCount > 0) {
            status = emailStatus.opened;
            this.emailMeta.openedCount -= 1;
        } else if (this.emailMeta.deliveredCount > 0) {
            status = emailStatus.delivered;
            this.emailMeta.deliveredCount -= 1;
        }

        let deliveredTime;
        if (status === emailStatus.opened) {
            const startDate = this.batch.updated_at;
            const endDate = timestamp;
            deliveredTime = faker.date.between(startDate, endDate);
        }

        return {
            // Using sorted ids are much much faster (35% as far as my testing goes) for huge imports
            id: this.fastFakeObjectId(),
            email_id: this.model.id,
            batch_id: this.batch.id,
            member_id: member.id,
            processed_at: dateToDatabaseString(this.batch.updated_at),
            delivered_at: status === emailStatus.opened ? dateToDatabaseString(deliveredTime) : status === emailStatus.delivered ? dateToDatabaseString(timestamp) : null,
            opened_at: status === emailStatus.opened ? dateToDatabaseString(timestamp) : null,
            failed_at: status === emailStatus.failed ? dateToDatabaseString(timestamp) : null,
            member_uuid: member.uuid,
            member_email: member.email,
            member_name: member.name
        };
    }
}

module.exports = EmailRecipientsImporter;
