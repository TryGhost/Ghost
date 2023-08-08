const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class MembersClickEventsImporter extends TableImporter {
    static table = 'members_click_events';
    static dependencies = ['email_recipients', 'redirects', 'emails'];

    constructor(knex, transaction) {
        super(MembersClickEventsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const emailRecipients = await this.transaction.select('id', 'opened_at', 'email_id', 'member_id').from('email_recipients');
        this.redirects = await this.transaction.select('id', 'post_id').from('redirects');
        this.emails = await this.transaction.select('id', 'post_id').from('emails');
        this.quantity = quantity ? quantity / emailRecipients.length : 2;

        await this.importForEach(emailRecipients, this.quantity);
    }

    setReferencedModel(model) {
        this.model = model;
        this.amount = model.opened_at === null ? 0 : luck(40) ? faker.datatype.number({
            min: 0,
            max: this.quantity
        }) : 0;
        const email = this.emails.find(e => e.id === this.model.email_id);
        this.redirectList = this.redirects.filter(redirect => redirect.post_id === email.post_id);
    }

    generate() {
        if (this.amount <= 0 || this.redirectList.length === 0) {
            return;
        }
        this.amount -= 1;

        const openedAt = new Date(this.model.opened_at);
        const laterOn = new Date(this.model.opened_at);
        laterOn.setMinutes(laterOn.getMinutes() + 15);
        const clickTime = new Date(openedAt.valueOf() + (Math.random() * (laterOn.valueOf() - openedAt.valueOf())));

        return {
            id: faker.database.mongodbObjectId(),
            member_id: this.model.member_id,
            redirect_id: this.redirectList[faker.datatype.number({
                min: 0,
                max: this.redirectList.length - 1
            })].id,
            created_at: dateToDatabaseString(clickTime)
        };
    }
}

module.exports = MembersClickEventsImporter;
