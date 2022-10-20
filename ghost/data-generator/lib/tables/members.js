const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {blogStartDate: startTime} = require('../utils/blog-info');
const generateEvents = require('../utils/event-generator');
const {luck} = require('../utils/random');

class MembersImporter extends TableImporter {
    constructor(knex) {
        super('members', knex);
    }

    setImportOptions({amount}) {
        this.timestamps = generateEvents({
            shape: 'ease-in',
            trend: 'positive',
            total: amount,
            startTime,
            endTime: new Date()
        });
    }

    generate() {
        const id = faker.database.mongodbObjectId();
        const name = `${faker.name.firstName()} ${faker.name.lastName()}`;
        const timestamp = this.timestamps.shift();
        return {
            id,
            uuid: faker.datatype.uuid(),
            email: faker.internet.exampleEmail(name, faker.random.numeric(7)),
            status: luck(5) ? 'comped' : luck(25) ? 'paid' : 'free',
            name: name,
            expertise: luck(30) ? faker.name.jobTitle() : undefined,
            geolocation: luck(40) ? `${faker.address.country}` : undefined,
            email_count: 0, // Depends on number of emails sent since created_at, the newsletter they're a part of and subscription status
            email_opened_count: 0,
            email_open_rate: 0,
            // 40% of users logged in within a week, 60% sometime since registering
            last_seen_at: luck(40) ? faker.date.recent(7) : faker.date.between(timestamp, new Date()),
            created_at: timestamp,
            created_by: id
        };
    }
}

module.exports = MembersImporter;
