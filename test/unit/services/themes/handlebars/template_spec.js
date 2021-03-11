const should = require('should');
const proxy = require('../../../../../core/frontend/services/proxy');

describe('Helpers Template', function () {
    it('can execute a template', function () {
        proxy.hbs.registerPartial('test', '<h1>Hello {{name}}</h1>');

        const safeString = proxy.templates.execute('test', {name: 'world'});

        should.exist(safeString);
        safeString.should.have.property('string').and.equal('<h1>Hello world</h1>');
    });
});
