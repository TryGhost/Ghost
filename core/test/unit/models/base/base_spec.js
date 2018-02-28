'use strict';

var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    models = require('../../../../server/models'),
    ghostBookshelf,
    testUtils = require('../../../utils'),

    sandbox = sinon.sandbox.create();

describe.skip('Models: base', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('setEmptyValuesToNull', function () {
        let knexMock;

        before(function () {
            knexMock = new testUtils.mocks.knex();
            knexMock.mock();
        });

        after(function () {
            knexMock.unmock();
        });

        // TODO: mock the base model und run those tests
        it('resets given empty value to null');
        it('does not reset to null if model does\'t provide properties');
    });
});
