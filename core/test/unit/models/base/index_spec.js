'use strict';

var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    models = require('../../../../server/models'),
    ghostBookshelf,
    testUtils = require('../../../utils'),

    sandbox = sinon.sandbox.create();

describe('Models: base', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('setEmptyValuesToNull', function () {
        it('resets given empty value to null', function () {
            const base = models.Base.Model.forge({a: '', b: ''});

            base.emptyStringProperties = sandbox.stub();
            base.emptyStringProperties.returns(['a']);

            base.get('a').should.eql('');
            base.get('b').should.eql('');
            base.setEmptyValuesToNull();
            should.not.exist(base.get('a'));
            base.get('b').should.eql('');
        });

        it('does not reset to null if model does\'t provide properties', function () {
            const base = models.Base.Model.forge({a: ''});
            base.get('a').should.eql('');
            base.setEmptyValuesToNull();
            base.get('a').should.eql('');
        });
    });
});
