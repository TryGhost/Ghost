const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const generateEvents = require('../utils/event-generator');
const dateToDatabaseString = require('../utils/database-date');

const emailStatus = {
    delivered: Symbol(),
    opened: Symbol(),
    failed: Symbol(),
    none: Symbol()
};

class EmailRecipientsImporter extends TableImporter {
    static table = 'email_recipients';

    constructor(knex, {emailBatches, members, membersSubscribeEvents}) {
        super(EmailRecipientsImporter.table, knex);
        this.emailBatches = emailBatches;
        this.members = members;
        this.membersSubscribeEvents = membersSubscribeEvents;
    }

    setImportOptions({model}) {
        this.model = model;
        this.batch = this.emailBatches.find(batch => batch.email_id === model.id);
        // Shallow clone members list so we can shuffle and modify it
        const earliestOpenTime = new Date(this.batch.updated_at);
        const latestOpenTime = new Date(this.batch.updated_at);
        latestOpenTime.setDate(latestOpenTime.getDate() + 14);
        const currentTime = new Date();
        this.membersList = this.membersSubscribeEvents
            .filter(entry => entry.newsletter_id === this.model.newsletter_id)
            .filter(entry => new Date(entry.created_at) < earliestOpenTime)
            .map(memberSubscribeEvent => memberSubscribeEvent.member_id);
        this.events = this.membersList.length > 0 ? generateEvents({
            shape: 'ease-out',
            trend: 'negative',
            total: this.membersList.length,
            startTime: earliestOpenTime,
            endTime: currentTime < latestOpenTime ? currentTime : latestOpenTime
        }) : [];
        this.emailMeta = {
            emailCount: this.model.email_count,
            // delievered and not opened
            deliveredCount: this.model.delivered_count - this.model.opened_count,
            openedCount: this.model.opened_count,
            failedCount: this.model.failed_count
        };
    }

    generate() {
        if (this.emailMeta.emailCount <= 0) {
            return;
        }
        this.emailMeta.emailCount -= 1;

        const timestamp = this.events.shift();
        if (!timestamp) {
            return;
        }

        const memberIdIndex = faker.datatype.number({
            min: 0,
            max: this.membersList.length - 1
        });
        const [memberId] = this.membersList.splice(memberIdIndex, 1);
        const member = this.members.find(m => m.id === memberId);

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
            const startDate = new Date(this.batch.updated_at).valueOf();
            const endDate = timestamp.valueOf();
            deliveredTime = new Date(startDate + (Math.random() * (endDate - startDate)));
        }

        return {
            id: faker.database.mongodbObjectId(),
            email_id: this.model.id,
            batch_id: this.batch.id,
            member_id: member.id,
            processed_at: this.batch.updated_at,
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
