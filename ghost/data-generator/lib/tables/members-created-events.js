const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');

class MembersCreatedEventsImporter extends TableImporter {
    static table = 'members_created_events';

    constructor(knex, {posts}) {
        super(MembersCreatedEventsImporter.table, knex);

        this.posts = [...posts];
        // Sort posts in reverse chronologoical order
        this.posts.sort((a, b) => new Date(b.published_at).valueOf() - new Date(a.published_at).valueOf());
    }

    setImportOptions({model}) {
        this.model = model;
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
