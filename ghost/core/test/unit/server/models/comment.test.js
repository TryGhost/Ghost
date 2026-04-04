const sinon = require('sinon');
const models = require('../../../../core/server/models');

describe('Unit: models/comment', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });
});
