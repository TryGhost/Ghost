import {getSettingValue, getSettingValues, isSettingReadOnly, shouldInvalidateAfterSettingsEdit} from '../../../../src/api/settings';

describe('settings utils', () => {
    describe('getSettingValue', () => {
        it('returns the value of a setting', () => {
            const settings = [
                {key: 'test_key', value: 'test_value'}
            ];
            const value = getSettingValue(settings, 'test_key');
            expect(value).toEqual('test_value');
        });

        it('returns null if settings is null', () => {
            const settings = undefined;
            const value = getSettingValue(settings, 'test_key');
            expect(value).toEqual(null);
        });
    });

    describe('getSettingValues', () => {
        it('returns the values of multiple settings', () => {
            const settings = [
                {key: 'test_key', value: 'test_value'},
                {key: 'test_key_2', value: 'test_value_2'}
            ];
            const values = getSettingValues(settings, ['test_key', 'test_key_2']);
            expect(values).toEqual(['test_value', 'test_value_2']);
        });

        it('returns undefined for missing keys', () => {
            const values = getSettingValues([], ['test_key', 'test_key_2']);
            expect(values).toEqual([undefined, undefined]);
        });
    });

    describe('isSettingReadOnly', () => {
        it('returns true if the setting has an override', () => {
            const settings = [
                {key: 'test_key', is_read_only: true, value: 'test_value'}
            ];
            const value = isSettingReadOnly(settings, 'test_key');
            expect(value).toEqual(true);
        });

        it('returns false if the setting does not have an override', () => {
            const settings = [
                {key: 'test_key', is_read_only: false, value: 'test_value'}
            ];
            const value = isSettingReadOnly(settings, 'test_key');
            expect(value).toEqual(false);
        });

        it('returns undefined if settings is falsy', () => {
            const settings = undefined;
            const value = isSettingReadOnly(settings, 'test_key');
            expect(value).toEqual(undefined);
        });
    });

    describe('shouldInvalidateAfterSettingsEdit', () => {
        it('does not invalidate settings queries', () => {
            expect(shouldInvalidateAfterSettingsEdit({queryKey: ['SettingsResponseType']})).toBe(false);
        });

        it('does not invalidate ActivityPub package queries', () => {
            expect(shouldInvalidateAfterSettingsEdit({queryKey: ['notifications_count', 'ghost']})).toBe(false);
        });

        it('does not invalidate Admin framework ActivityPub queries', () => {
            expect(shouldInvalidateAfterSettingsEdit({
                queryKey: ['InboxResponseData', 'http://localhost:2368/.ghost/activitypub/reader/ghost']
            })).toBe(false);
        });

        it('invalidates other Admin queries', () => {
            expect(shouldInvalidateAfterSettingsEdit({queryKey: ['ConfigResponseType']})).toBe(true);
        });
    });
});
