const assert = require('node:assert/strict');
const sinon = require('sinon');
const testUtils = require('../../../utils');
const config = require('../../../../core/shared/config');
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
            assert.equal(afterInsert.length, 1);
            assert.equal(afterInsert[0].value, 'https://example.com/image.png');

            // do the actual update
            const modelAfterUpdate = await models.CustomThemeSetting.edit({value: '/image.png'}, {id: modelToUpdate.id});

            // model.value should return an absolute URL
            assert.equal(modelAfterUpdate.get('value'), `${config.get('url')}/image.png`);

            // direct knex query to check raw db value
            const afterUpdate = await db.knex('custom_theme_settings').where({id: modelToUpdate.id});
            assert.equal(afterUpdate.length, 1);
            assert.equal(afterUpdate[0].value, '__GHOST_URL__/image.png');
        });

        it('formats values correctly on insert', async function () {
            const insertedModel = await models.CustomThemeSetting.add({
                theme: 'test',
                key: 'update_test',
                value: '/image.png',
                type: 'image'
            });

            // model.value should return an absolute URL
            assert.equal(insertedModel.get('value'), `${config.get('url')}/image.png`);

            // direct knex query to check raw db value
            const rawInsertDate = await db.knex('custom_theme_settings').where({id: insertedModel.id});
            assert.equal(rawInsertDate.length, 1);
            assert.equal(rawInsertDate[0].value, '__GHOST_URL__/image.png');
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
            assert.equal(modelInstance.get('value'), `${config.get('url')}/image.png`);

            // called twice because format is also called on fetch
            // see https://github.com/TryGhost/Ghost/commit/426cbeec0f57886fbb4c7a1ebd2ce696913b03eb
            sinon.assert.calledTwice(format);

            // only called once for the actual write
            sinon.assert.calledOnce(formatOnWrite);
        });
    });
});
