const {faker} = require('@faker-js/faker');
const TableImporter = require('./TableImporter');

class PostsTagsImporter extends TableImporter {
    static table = 'posts_tags';
    static dependencies = ['posts', 'tags'];

    constructor(knex, transaction) {
        super(PostsTagsImporter.table, knex, transaction);
        this.sortOrder = 0;
    }

    async import(quantity) {
        const posts = await this.transaction.select('id').from('posts').where('type', 'post');
        this.tags = await this.transaction.select('id').from('tags');

        await this.importForEach(posts, quantity ? quantity / posts.length : () => faker.datatype.number({
            min: 0,
            max: 3
        }));
    }

    setReferencedModel(model) {
        this.model = model;
        this.notIndex = [];
    }

    generate() {
        const sortOrder = this.sortOrder;
        this.sortOrder = this.sortOrder + 1;
        let tagIndex = 0;
        do {
            tagIndex = faker.datatype.number(this.tags.length - 1);
        } while (this.notIndex.includes(tagIndex));
        this.notIndex.push(tagIndex);

        return {
            id: this.fastFakeObjectId(),
            post_id: this.model.id,
            tag_id: this.tags[tagIndex].id,
            sort_order: sortOrder
        };
    }
}

module.exports = PostsTagsImporter;
