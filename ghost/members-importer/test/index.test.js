const assert = require('assert/strict');
const MembersCSVImporter = require('../lib/MembersCSVImporter');
const makeImporter = require('..');

describe('makeImporter', function (){
    it('should return an instance of MembersCSVImporter', function (){
        const importer = makeImporter({});

        assert.ok(importer instanceof MembersCSVImporter);
    });
});
