const should = require('should');
const errors = require('@tryghost/errors');
const {hbs, templates} = require('../../../../../../core/frontend/services/handlebars');

describe('Helpers Template', function () {
    it('can execute a template', function () {
        hbs.registerPartial('test', '<h1>Hello {{name}}</h1>');

        const safeString = templates.execute('test', {name: 'world'});

        should.exist(safeString);
        safeString.should.have.property('string').and.equal('<h1>Hello world</h1>');
    });

    it('will throw an IncorrectUsageError if the partial does not exist', function () {
        should.throws(() => {
            templates.execute('non-existent');
        }, errors.IncorrectUsageError);
    });
});
