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
        const emailRecipients = await this.transaction.select('id', 'opened_at', 'email_id', 'member_id').from('email_recipients').whereNotNull('opened_at');
        const redirects = await this.transaction.select('id', 'post_id').from('redirects');
        const emails = await this.transaction.select('id', 'post_id').from('emails');
        this.quantity = quantity ? quantity / emailRecipients.length : 2;

        // Create maps for faster lookups (this does make a difference for large data generation)
        this.emails = new Map();
        for (const email of emails) {
            this.emails.set(email.id, email);
        }

        this.redirects = new Map();
        for (const redirect of redirects) {
            if (!this.redirects.has(redirect.post_id)) {
                this.redirects.set(redirect.post_id, []);
            }
            this.redirects.get(redirect.post_id).push(redirect);
        }

        await this.importForEach(emailRecipients, this.quantity);
    }

    setReferencedModel(model) {
        this.model = model;
        this.amount = model.opened_at === null ? 0 : luck(40) ? faker.datatype.number({
            min: 0,
            max: this.quantity
        }) : 0;
        const email = this.emails.get(model.email_id);
        this.redirectList = this.redirects.get(email.post_id) ?? [];
    }

    generate() {
        if (this.amount <= 0 || this.redirectList.length === 0 || !this.model.opened_at) {
            return;
        }
        this.amount -= 1;

        const openedAt = new Date(this.model.opened_at);
        const laterOn = new Date(openedAt.getTime() + 1000 * 60 * 15);
        const clickTime = faker.date.between(openedAt.getTime(), laterOn.getTime()); //added getTime here because it threw random errors

        return {
            id: this.fastFakeObjectId(),
            member_id: this.model.member_id,
            redirect_id: this.redirectList[this.redirectList.length === 1 ? 0 : (faker.datatype.number({
                min: 0,
                max: this.redirectList.length - 1
            }))].id,
            created_at: dateToDatabaseString(clickTime)
        };
    }
}

module.exports = MembersClickEventsImporter;
