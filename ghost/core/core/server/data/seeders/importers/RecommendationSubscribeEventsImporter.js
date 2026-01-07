const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');

class RecommendationSubscribeEventsImporter extends TableImporter {
    static table = 'recommendation_subscribe_events';
    static dependencies = ['recommendations', 'members'];

    constructor(knex, transaction) {
        super(RecommendationSubscribeEventsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const recommendations = await this.transaction.select('id', 'created_at').from('recommendations').where('one_click_subscribe', true);
        this.members = await this.transaction.select('id').from('members').limit(500);

        await this.importForEach(recommendations, quantity ? quantity / recommendations.length : () => faker.datatype.number({min: 0, max: 50}));
    }

    generate() {
        // Not unique
        const member = luck(1) ? null : faker.helpers.arrayElement(this.members);
        return {
            id: this.fastFakeObjectId(),
            recommendation_id: this.model.id,
            member_id: member?.id ?? null,
            created_at: faker.date.past()
        };
    }
}

module.exports = RecommendationSubscribeEventsImporter;
