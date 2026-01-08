const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class MembersCreatedEventsImporter extends TableImporter {
    static table = 'members_created_events';
    static dependencies = ['members', 'posts', 'mentions'];

    constructor(knex, transaction) {
        super(MembersCreatedEventsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const members = await this.transaction.select('id', 'created_at').from('members');
        this.posts = await this.transaction.select('id', 'published_at', 'visibility', 'type', 'slug').from('posts').orderBy('published_at', 'desc');
        this.incomingRecommendations = await this.transaction.select('id', 'source', 'created_at').from('mentions');

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

        // We need to add all properties here already otherwise CSV imports won't know all the columns
        let attribution = {
            attribution_id: null,
            attribution_type: null,
            attribution_url: null
        };
        let referrer = {
            referrer_source: null,
            referrer_url: null,
            referrer_medium: null
        };

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

        if (source === 'member' && luck(40)) {
            if (luck(20)) {
                // Ghost network
                referrer = {
                    referrer_source: luck(20) ? 'Ghost.org' : 'Ghost Explore',
                    referrer_url: 'ghost.org',
                    referrer_medium: 'Ghost Network'
                };
            } else {
                // Incoming recommendation
                const incomingRecommendation = faker.helpers.arrayElement(this.incomingRecommendations);

                const hostname = new URL(incomingRecommendation.source).hostname;
                referrer = {
                    referrer_source: hostname,
                    referrer_url: hostname,
                    referrer_medium: faker.helpers.arrayElement([null, 'Email'])
                };
            }
        }

        if (source === 'import') {
            referrer.referrer_source = 'Imported';
            referrer.referrer_medium = 'Member Importer';
        } else if (source === 'admin') {
            referrer.referrer_source = 'Created manually';
            referrer.referrer_medium = 'Ghost Admin';
        } else if (source === 'api') {
            referrer.referrer_source = 'Created via API';
            referrer.referrer_medium = 'Admin API';
        }

        return {
            id: this.fastFakeObjectId(),
            created_at: dateToDatabaseString(this.model.created_at),
            member_id: this.model.id,
            source,
            ...attribution,
            ...referrer
        };
    }
}

module.exports = MembersCreatedEventsImporter;
