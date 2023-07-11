const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');

class PostsTagsImporter extends TableImporter {
    static table = 'posts_tags';
    constructor(knex, {tags}) {
        super(PostsTagsImporter.table, knex);
        this.tags = tags;
        this.sortOrder = 0;
    }

    setImportOptions({model}) {
        this.notIndex = [];
        this.sortOrder = 0;
        this.model = model;
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
            id: faker.database.mongodbObjectId(),
            post_id: this.model.id,
            tag_id: this.tags[tagIndex].id,
            sort_order: sortOrder
        };
    }
}

module.exports = PostsTagsImporter;
