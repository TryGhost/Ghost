const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');

class MembersCreatedEventsImporter extends TableImporter {
    static table = 'members_created_events';
    static dependencies = ['members', 'posts'];

    constructor(knex, transaction) {
        super(MembersCreatedEventsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const members = await this.transaction.select('id', 'created_at').from('members');
        this.posts = await this.transaction.select('id', 'published_at', 'visibility', 'type', 'slug').from('posts').orderBy('published_at', 'desc');

        await this.importForEach(members, quantity ? quantity / members.length : 1);
    }

    generateSource() {
        let source = 'member';
        if (luck(10)) {
            source = 'admin';
        } else if (luck(5)) {
            source = 'api';
        } else if (luck(5)) { // eslint-disable-line no-dupe-else-if
            source = 'import';
        }
        return source;
    }

    generate() {
        const source = this.generateSource();
        let attribution = {};
        if (source === 'member' && luck(30)) {
            const post = this.posts.find(p => p.visibility === 'public' && new Date(p.published_at) < new Date(this.model.created_at));
            if (post) {
                attribution = {
                    attribution_id: post.id,
                    attribution_type: post.type,
                    attribution_url: post.slug
                };
            }
        }
        return Object.assign({}, {
            id: faker.database.mongodbObjectId(),
            created_at: this.model.created_at,
            member_id: this.model.id,
            source
        }, attribution);
    }
}

module.exports = MembersCreatedEventsImporter;
