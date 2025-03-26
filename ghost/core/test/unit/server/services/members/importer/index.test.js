const assert = require('assert/strict');
const MembersCSVImporter = require('../../../../../../core/server/services/members/importer/MembersCSVImporter');
const makeImporter = require('../../../../../../core/server/services/members/importer');

describe('makeImporter', function (){
    it('should return an instance of MembersCSVImporter', function (){
        const importer = makeImporter({});

        assert.ok(importer instanceof MembersCSVImporter);
    });
});
