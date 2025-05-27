import {describe, it} from 'vitest';
import {expect} from 'vitest';
import {showDatabaseWarning} from '../../../src/utils/showDatabaseWarning';

describe('showDatabaseWarning', function () {
    it('shows a warning when in production and not using MySQL 8', function () {
        expect(showDatabaseWarning('production', 'mysql5')).toBe(true);
    });

    it('shows a warning when in development and using MySQL 5', function () {
        expect(showDatabaseWarning('development', 'mysql5')).toBe(true);
    });

    it('does not show a warning when in production and using MySQL 8', function () {
        expect(showDatabaseWarning('production', 'mysql8')).toBe(false);
    });

    it('does not show a warning when in development and using MySQL 8', function () {
        expect(showDatabaseWarning('development', 'mysql8')).toBe(false);
    });
});
