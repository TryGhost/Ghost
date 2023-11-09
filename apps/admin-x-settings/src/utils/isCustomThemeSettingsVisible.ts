import nql from '@tryghost/nql';
import {CustomThemeSetting} from '@tryghost/admin-x-framework/api/customThemeSettings';

export function isCustomThemeSettingVisible(setting: CustomThemeSetting, settingsKeyValueObj: Record<string, string>) {
    if (!setting.visibility) {
        return true;
    }

    return nql(setting.visibility).queryJSON(settingsKeyValueObj);
}
