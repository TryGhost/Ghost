import * as assert from 'assert/strict';
import {showDatabaseWarning} from '../../../src/utils/showDatabaseWarning';

describe('showDatabaseWarning', function () {
    it('shows a warning when in production and not using MySQL 8', function () {
        assert.equal(showDatabaseWarning('production', 'mysql5'), true);
    });

    it('shows a warning when in development and using MySQL 5', function () {
        assert.equal(showDatabaseWarning('development', 'mysql5'), true);
    });

    it('does not show a warning when in production and using MySQL 8', function () {
        assert.equal(showDatabaseWarning('production', 'mysql8'), false);
    });

    it('does not show a warning when in development and using MySQL 8', function () {
        assert.equal(showDatabaseWarning('development', 'mysql8'), false);
    });
});
