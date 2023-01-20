const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const generateEvents = require('../utils/event-generator');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class EmailsImporter extends TableImporter {
    constructor(knex, {newsletters, members, membersSubscribeEvents}) {
        super('emails', knex);
        this.newsletters = newsletters;
        this.members = members;
        this.membersSubscribeEvents = membersSubscribeEvents;
    }

    setImportOptions({model}) {
        this.model = model;
    }

    generate() {
        const id = faker.database.mongodbObjectId();

        const newsletter = luck(90)
            ? this.newsletters.find(nl => nl.name === 'Regular premium')
            : this.newsletters.find(nl => nl.name !== 'Regular premium');

        const timestamp = luck(60)
            ? new Date(this.model.published_at)
            : generateEvents({
                shape: 'ease-out',
                trend: 'negative',
                total: 1,
                startTime: new Date(this.model.published_at),
                endTime: new Date()
            })[0];

        const recipientCount = this.membersSubscribeEvents
            .filter(entry => entry.newsletter_id === newsletter.id)
            .filter(entry => new Date(entry.created_at) < timestamp).length;
        const deliveredCount = Math.ceil(recipientCount * faker.datatype.float({
            max: 1,
            min: 0.9,
            precision: 0.001
        }));
        const openedCount = Math.ceil(deliveredCount * faker.datatype.float({
            max: 0.95,
            min: 0.6,
            precision: 0.001
        }));
        const failedCount = Math.floor((recipientCount - deliveredCount) * faker.datatype.float({
            max: 0.05,
            min: 0,
            precision: 0.001
        }));

        return {
            id,
            uuid: faker.datatype.uuid(),
            post_id: this.model.id,
            status: 'submitted',
            recipient_filter: '', // TODO: Add recipient filter?
            email_count: recipientCount,
            delivered_count: deliveredCount,
            opened_count: openedCount,
            failed_count: failedCount,
            subject: this.model.title,
            source_type: 'html',
            track_opens: true,
            track_clicks: true,
            feedback_enabled: true,
            submitted_at: dateToDatabaseString(timestamp),
            newsletter_id: newsletter.id,
            created_at: dateToDatabaseString(timestamp),
            created_by: 'unused',
            updated_at: dateToDatabaseString(timestamp),
            updated_by: 'unused'
        };
    }
}

module.exports = EmailsImporter;
