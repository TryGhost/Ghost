import { type CustomThemeSetting } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { isCustomThemeSettingVisible } from '@/settings/utils/is-custom-theme-settings-visible';

describe('isCustomThemeSettingVisible', function () {
  it('returns whether or not a custom theme setting is visible', function () {
    const settings: CustomThemeSetting[] = [
      {
        id: 'abc123',
        key: 'foo',
        type: 'boolean',
        value: false,
        default: true,
      },
      {
        id: 'def456',
        key: 'bar',
        type: 'text',
        value: 'qux',
        default: 'qux',
        visibility: 'foo:true',
      },
    ];
    const settingsKeyValueObj = settings.reduce(
      (obj, { key, value }) => ({ ...obj, [key]: value }),
      {},
    );

    expect(isCustomThemeSettingVisible(settings[0], settingsKeyValueObj)).toBe(true);
    expect(isCustomThemeSettingVisible(settings[1], settingsKeyValueObj)).toBe(false);
  });
});
