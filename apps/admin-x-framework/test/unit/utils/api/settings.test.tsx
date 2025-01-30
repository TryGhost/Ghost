import {getSettingValue, getSettingValues, isSettingReadOnly} from '../../../../src/api/settings';

describe('settings utils', function () {
    describe('getSettingValue', function () {
        it('returns the value of a setting', function () {
            const settings = [
                {key: 'test_key', value: 'test_value'}
            ];
            const value = getSettingValue(settings, 'test_key');
            expect(value).toEqual('test_value');
        });

        it('returns null if settings is null', function () {
            const settings = undefined;
            const value = getSettingValue(settings, 'test_key');
            expect(value).toEqual(null);
        });
    });

    describe('getSettingValues', function () {
        it('returns the values of multiple settings', function () {
            const settings = [
                {key: 'test_key', value: 'test_value'},
                {key: 'test_key_2', value: 'test_value_2'}
            ];
            const values = getSettingValues(settings, ['test_key', 'test_key_2']);
            expect(values).toEqual(['test_value', 'test_value_2']);
        });

        it('returns undefined for missing keys', function () {
            const values = getSettingValues([], ['test_key', 'test_key_2']);
            expect(values).toEqual([undefined, undefined]);
        });
    });

    describe('isSettingReadOnly', function () {
        it('returns true if the setting has an override', function () {
            const settings = [
                {key: 'test_key', override: true, value: 'test_value'}
            ];
            const value = isSettingReadOnly(settings, 'test_key');
            expect(value).toEqual(true);
        });

        it('returns false if the setting does not have an override', function () {
            const settings = [
                {key: 'test_key', override: false, value: 'test_value'}
            ];
            const value = isSettingReadOnly(settings, 'test_key');
            expect(value).toEqual(false);
        });

        it('returns null if settings is null', function () {
            const settings = undefined;
            const value = isSettingReadOnly(settings, 'test_key');
            expect(value).toEqual(null);
        });
    });
});
