const assert = require('node:assert/strict');
const sinon = require('sinon');
const settingsCache = require('../../../../../core/shared/settings-cache');
const {getCSVExportFileName} = require('../../../../../core/server/api/endpoints/utils/csv-export-filename');

describe('Unit: api/endpoints/utils/csv-export-filename', function () {
    afterEach(function () {
        sinon.restore();
    });

    function stubTitle(title) {
        sinon.stub(settingsCache, 'get').callsFake(function (key) {
            return key === 'title' ? title : undefined;
        });
    }

    it('prefixes the slugified site title', function () {
        stubTitle('My Publication');
        assert.match(getCSVExportFileName('members'), /^my-publication\.ghost\.members\.\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('uses the given export type', function () {
        stubTitle('My Publication');
        assert.match(getCSVExportFileName('analytics'), /^my-publication\.ghost\.analytics\.\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('transliterates non-ASCII titles via slugify', function () {
        stubTitle('Café Münchën');
        assert.match(getCSVExportFileName('members'), /^cafe-munchen\.ghost\.members\.\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('falls back to no prefix when the title is empty', function () {
        stubTitle('');
        assert.match(getCSVExportFileName('members'), /^ghost\.members\.\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('falls back to no prefix when the title slugifies to an empty string', function () {
        stubTitle('!!!');
        assert.match(getCSVExportFileName('members'), /^ghost\.members\.\d{4}-\d{2}-\d{2}\.csv$/);
    });
});
