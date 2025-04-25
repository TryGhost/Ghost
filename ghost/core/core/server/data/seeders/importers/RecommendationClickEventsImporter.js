const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');

class RecommendationClickEventsImporter extends TableImporter {
    static table = 'recommendation_click_events';
    static dependencies = ['recommendations', 'members'];

    constructor(knex, transaction) {
        super(RecommendationClickEventsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const recommendations = await this.transaction.select('id', 'created_at').from('recommendations');
        this.members = await this.transaction.select('id').from('members').limit(500);

        await this.importForEach(recommendations, quantity ? quantity / recommendations.length : () => faker.datatype.number({min: 0, max: 30}));
    }

    generate() {
        // Not unique
        const member = luck(30) ? null : faker.helpers.arrayElement(this.members);
        return {
            id: this.fastFakeObjectId(),
            recommendation_id: this.model.id,
            member_id: member?.id ?? null,
            created_at: faker.date.past()
        };
    }
}

module.exports = RecommendationClickEventsImporter;
