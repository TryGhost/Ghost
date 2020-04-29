const should = require('should');
const hbs = require('../../../../../core/frontend/services/themes/engine');
const template = require('../../../../../core/frontend/services/themes/handlebars/template');

describe('Helpers Template', function () {
    it('can execute a template', function () {
        hbs.registerPartial('test', '<h1>Hello {{name}}</h1>');

        const safeString = template.execute('test', {name: 'world'});

        should.exist(safeString);
        safeString.should.have.property('string').and.equal('<h1>Hello world</h1>');
    });
});
