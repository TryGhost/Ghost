/*globals describe, beforeEach, it*/
var testUtils = require('../utils'),
    should    = require('should'),
    sinon     = require('sinon'),
    when      = require('when'),
    _         = require('underscore'),
    path      = require('path'),
    hbs = require('express-hbs'),

    // Stuff we are testing
    config   = require('../../server/config'),
    api      = require('../../server/api'),
    template = require('../../server/helpers/template');

describe('Helpers Template', function () {

    it("can execute a template", function () {
        hbs.registerPartial('test', '<h1>Hello {{name}}</h1>');

        var safeString = template.execute('test', {name: 'world'});

        should.exist(safeString);
        safeString.should.have.property('string').and.equal('<h1>Hello world</h1>');
    });
});