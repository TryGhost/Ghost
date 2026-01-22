const importer = require('../../../core/server/data/importer');
const models = require('../../../core/server/models');
const testUtils = require('../../utils');
const {exportedBodyV5} = require('../../utils/fixtures/export/body-generator');

const dataImporter = importer.importers.find((instance) => {
    return instance.type === 'data';
});

const importOptions = {
    returnImportedData: true
};

const LEGACY_HARDCODED_USER_ID = '1';

describe('Importing 5.x export', function () {
    beforeEach(async function () {
        await testUtils.teardownDb();
        await testUtils.setup('roles', 'owner')();
    });

    it('imports 5.x data', async function () {
        const exportData = exportedBodyV5().db[0];

        exportData.data.users[0] = testUtils.DataGenerator.forKnex.createUser({
            id: LEGACY_HARDCODED_USER_ID,
            email: 'import-test-user@ghost.org',
            slug: 'import-test-user'
        });

        exportData.data.roles = [
            testUtils.DataGenerator.forKnex.createRole({name: 'Owner'})
        ];

        exportData.data.roles_users = [
            testUtils.DataGenerator.forKnex.createUsersRoles(exportData.data.users[0].id, exportData.data.roles[0].id)
        ];

        exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
            slug: 'post1',
            title: 'title1',
            authors: [{
                id: exportData.data.users[0].id
            }],
            published_by: exportData.data.users[0].id
        });

        exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
            slug: 'post2',
            title: 'title2',
            authors: [{
                id: exportData.data.users[0].id
            }],
            published_by: exportData.data.users[0].id
        });

        const postOptions = Object.assign({withRelated: ['authors']}, testUtils.context.internal);
        const userOptions = Object.assign({withRelated: ['roles']}, testUtils.context.internal);

        await dataImporter.doImport(exportData, importOptions);

        const users = await models.User.findPage(userOptions);
        const posts = await models.Post.findPage(postOptions);

        users.data.length.should.equal(2);

        const user1 = users.data[0].toJSON();
        const user2 = users.data[1].toJSON();

        // Current owner user
        user1.email.should.equal('jbloggs@example.com');

        // Imported user
        user2.email.should.equal('import-test-user@ghost.org');
        user2.id.should.not.equal(LEGACY_HARDCODED_USER_ID);

        posts.data.length.should.equal(2);

        const post1 = posts.data[0].toJSON();
        const post2 = posts.data[1].toJSON();

        post1.authors[0].id.should.equal(user2.id);
        post2.authors[0].id.should.equal(user2.id);
    });
});
