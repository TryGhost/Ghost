const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const {faker: americanFaker} = require('@faker-js/faker/locale/en_US');
const {blogStartDate: startTime} = require('../utils/blog-info');
const generateEvents = require('../utils/event-generator');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class MembersImporter extends TableImporter {
    static table = 'members';
    static dependencies = [];
    defaultQuantity = faker.datatype.number({
        min: 7000,
        max: 8000
    });

    constructor(knex, transaction) {
        super(MembersImporter.table, knex, transaction);
    }

    async import(quantity = this.defaultQuantity) {
        this.timestamps = generateEvents({
            shape: 'ease-in',
            trend: 'positive',
            total: quantity,
            startTime,
            endTime: new Date()
        }).sort();

        await super.import(quantity);
    }

    /**
     * Add open rate data to members table
     */
    async finalise() {
        const emailRecipients = await this.transaction.select('id', 'member_id', 'opened_at').from('email_recipients');

        const memberData = {};
        for (const emailRecipient of emailRecipients) {
            if (!(emailRecipient.member_id in memberData)) {
                memberData[emailRecipient.member_id] = {
                    emailCount: 1,
                    openedCount: emailRecipient.opened_at ? 1 : 0
                };
            } else {
                memberData[emailRecipient.member_id].emailCount += 1;
                if (emailRecipient.opened_at) {
                    memberData[emailRecipient.member_id].openedCount += 1;
                }
            }
        }

        for (const [memberId, emailInfo] of Object.entries(memberData)) {
            const openRate = Math.round(100 * (emailInfo.openedCount / emailInfo.emailCount));
            await this.transaction('members').update({
                email_count: emailInfo.emailCount,
                email_opened_count: emailInfo.openedCount,
                email_open_rate: emailInfo.emailCount >= 5 ? openRate : null
            }).where({id: memberId});
        }
    }

    generate() {
        const id = faker.database.mongodbObjectId();
        // Use name from American locale to reflect an English-speaking audience
        const name = `${americanFaker.name.firstName()} ${americanFaker.name.lastName()}`;
        const timestamp = this.timestamps.shift();

        return {
            id,
            uuid: faker.datatype.uuid(),
            transient_id: faker.datatype.uuid(),
            email: `${name.replace(' ', '.').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}${faker.datatype.number({min: 1000, max: 9999})}@example.com`,
            status: luck(5) ? 'comped' : luck(25) ? 'paid' : 'free',
            name: name,
            expertise: luck(30) ? faker.name.jobTitle() : undefined,
            geolocation: JSON.stringify({
                organization_name: faker.company.name(),
                region: faker.address.state(),
                accuracy: 50,
                asn: parseInt(faker.random.numeric(4)),
                organization: `${faker.random.alpha({count: 2, casing: 'upper'})}${faker.random.numeric(4)} ${faker.company.name()}`,
                timezone: faker.address.timeZone(),
                longitude: faker.address.longitude(),
                country_code3: faker.address.countryCode('alpha-3'),
                area_code: '0',
                ip: faker.internet.ipv4(),
                city: faker.address.cityName(),
                country: faker.address.country(),
                continent_code: 'EU',
                country_code: faker.address.countryCode('alpha-2'),
                latitude: faker.address.latitude()
            }),
            email_count: 0, // Depends on number of emails sent since created_at, the newsletter they're a part of and subscription status
            email_opened_count: 0,
            email_open_rate: null,
            // 40% of users logged in within a week, 60% sometime since registering
            last_seen_at: luck(40) ? dateToDatabaseString(faker.date.recent(7)) : dateToDatabaseString(faker.date.between(timestamp, new Date())),
            created_at: dateToDatabaseString(timestamp),
            created_by: id,
            updated_at: dateToDatabaseString(timestamp)
        };
    }
}

module.exports = MembersImporter;
