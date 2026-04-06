const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const errors = require('@tryghost/errors');
const {hbs, templates} = require('../../../../../../core/frontend/services/handlebars');

describe('Helpers Template', function () {
    it('can execute a template', function () {
        hbs.registerPartial('test', '<h1>Hello {{name}}</h1>');

        const safeString = templates.execute('test', {name: 'world'});

        assertExists(safeString);
        assert.equal(safeString.string, '<h1>Hello world</h1>');
    });

    it('will throw an IncorrectUsageError if the partial does not exist', function () {
        assert.throws(() => {
            templates.execute('non-existent');
        }, errors.IncorrectUsageError);
    });
});
