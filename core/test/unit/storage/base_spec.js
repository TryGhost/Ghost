var should = require('should'),
    storage = require('../../../server/storage');

// to stop jshint complaining
should.equal(true, true);

describe('storage: base_spec', function () {
    it('escape non accepted characters in filenames', function () {
        var chosenStorage = storage.getStorage('themes');
        chosenStorage.getSanitizedFileName('(abc*@#123).zip').should.eql('-abc-@-123-.zip');
    });
});
