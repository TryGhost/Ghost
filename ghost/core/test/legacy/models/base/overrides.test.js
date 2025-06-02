const sinon = require('sinon');
const testUtils = require('../../../utils');
const db = require('../../../../core/server/data/db');
const models = require('../../../../core/server/models');

describe('Models: Base plugins: Overrides', function () {
    before(testUtils.teardownDb);
    before(testUtils.stopGhost);
    after(testUtils.teardownDb);

    // initializes models
    before(testUtils.setup('users:roles'));

    describe('formatOnWrite', function () {
        // using CustomThemeSetting model because it transforms .value relative URLs
        // to __GHOST_URL__ URLs in formatOnWrite()

        it('formats values correctly on update', async function () {
            const modelToUpdate = await models.CustomThemeSetting.add({
                theme: 'test',
                key: 'update_test',
                value: 'https://example.com/image.png',
                type: 'image'
            });

            // direct knex query for sense-check
            const afterInsert = await db.knex('custom_theme_settings').where({id: modelToUpdate.id});
            afterInsert.length.should.equal(1);
            afterInsert[0].value.should.equal('https://example.com/image.png');

            // do the actual update
            const modelAfterUpdate = await models.CustomThemeSetting.edit({value: '/image.png'}, {id: modelToUpdate.id});

            // model.value should return an absolute URL
            modelAfterUpdate.get('value').should.equal('http://127.0.0.1:2369/image.png');

            // direct knex query to check raw db value
            const afterUpdate = await db.knex('custom_theme_settings').where({id: modelToUpdate.id});
            afterUpdate.length.should.equal(1);
            afterUpdate[0].value.should.equal('__GHOST_URL__/image.png');
        });

        it('formats values correctly on insert', async function () {
            const insertedModel = await models.CustomThemeSetting.add({
                theme: 'test',
                key: 'update_test',
                value: '/image.png',
                type: 'image'
            });

            // model.value should return an absolute URL
            insertedModel.get('value').should.equal('http://127.0.0.1:2369/image.png');

            // direct knex query to check raw db value
            const rawInsertDate = await db.knex('custom_theme_settings').where({id: insertedModel.id});
            rawInsertDate.length.should.equal(1);
            rawInsertDate[0].value.should.equal('__GHOST_URL__/image.png');
        });

        it('is not called unnecessarily', async function () {
            const modelInstance = models.CustomThemeSetting.forge({
                theme: 'test',
                key: 'update_test',
                value: '/image.png',
                type: 'image'
            });

            const format = sinon.spy(modelInstance, 'format');
            const formatOnWrite = sinon.spy(modelInstance, 'formatOnWrite');

            await modelInstance.save(null, {method: 'insert'});

            // sanity check
            modelInstance.get('value').should.equal('http://127.0.0.1:2369/image.png');

            // called twice because format is also called on fetch
            // see https://github.com/TryGhost/Ghost/commit/426cbeec0f57886fbb4c7a1ebd2ce696913b03eb
            format.callCount.should.equal(2);

            // only called once for the actual write
            formatOnWrite.callCount.should.equal(1);
        });
    });
});
