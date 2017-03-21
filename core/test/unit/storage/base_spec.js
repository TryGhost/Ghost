var should = require('should'), // jshint ignore:line
    storage = require('../../../server/storage');

describe('storage: base_spec', function () {
    it('escape non accepted characters in filenames', function () {
        var chosenStorage = storage.getStorage('themes');
        chosenStorage.getSanitizedFileName('(abc*@#123).zip').should.eql('-abc-@-123-.zip');
    });
});
