const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');

class EmailRecipientFailuresImporter extends TableImporter {
    static table = 'email_recipient_failures';
    static dependencies = ['email_recipients'];

    constructor(knex, transaction) {
        super(EmailRecipientFailuresImporter.table, knex, transaction);
    }

    async import(quantity) {
        const recipients = await this.transaction
            .select(
                'id',
                'email_id',
                'member_id',
                'failed_at')
            .from('email_recipients')
            .whereNotNull('failed_at');

        await this.importForEach(recipients, quantity ? quantity / recipients.length : 1);
    }

    generate() {
        const errors = [
            {
                severity: 'permanent',
                code: 605,
                enhanced_code: null,
                message: 'Not delivering to previously bounced address'
            },
            {
                severity: 'permanent',
                code: 451,
                enhanced_code: '4.7.652',
                message: '4.7.652 The mail server [xxx.xxx.xxx.xxx] has exceeded the maximum number of connections.'
            },
            {
                message: 'No MX for example.com',
                code: 498,
                enhanced_code: null,
                severity: 'permanent'
            },
            {
                severity: 'temporary',
                code: 552,
                enhanced_code: null,
                message: '5.2.2 <xxxxxxxx@example.com>: user is over quota'
            }
        ];

        const error = faker.helpers.arrayElement(errors);

        return {
            id: this.fastFakeObjectId(),
            email_id: this.model.email_id,
            member_id: this.model.member_id,
            email_recipient_id: this.model.id,
            event_id: faker.random.alphaNumeric(20),
            ...error,
            failed_at: this.model.failed_at
        };
    }
}

module.exports = EmailRecipientFailuresImporter;
