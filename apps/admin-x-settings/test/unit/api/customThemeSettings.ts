import * as assert from 'assert/strict';
import {CustomThemeSetting, isCustomThemeSettingVisible} from '../../../src/api/customThemeSettings';

describe('isCustomThemeSettingVisible', function () {
    it('returns whether or not a custom theme setting is visible', function () {
        const settings: CustomThemeSetting[] = [
            {
                id: 'abc123',
                key: 'foo',
                type: 'boolean',
                value: false,
                default: true
            },
            {
                id: 'def456',
                key: 'bar',
                type: 'text',
                value: 'qux',
                default: 'qux',
                visibility: 'foo:true'
            }
        ];
        const settingsKeyValueObj = settings.reduce((obj, {key, value}) => ({...obj, [key]: value}), {});

        assert.equal(isCustomThemeSettingVisible(settings[0], settingsKeyValueObj), true);
        assert.equal(isCustomThemeSettingVisible(settings[1], settingsKeyValueObj), false);
    });
});
