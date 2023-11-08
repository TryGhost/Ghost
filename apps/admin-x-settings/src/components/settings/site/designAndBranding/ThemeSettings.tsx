import React from 'react';
import useHandleError from '../../../../utils/api/handleError';
import {ColorPickerField, Heading, Hint, ImageUpload, Select, SettingGroupContent, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {CustomThemeSetting} from '../../../../api/customThemeSettings';
import {getImageUrl, useUploadImage} from '../../../../api/images';
import {humanizeSettingKey} from '../../../../api/settings';
import {isCustomThemeSettingVisible} from '../../../../utils/isCustomThemeSettingsVisible';

const ThemeSetting: React.FC<{
    setting: CustomThemeSetting,
    setSetting: <Setting extends CustomThemeSetting>(value: Setting['value']) => void
}> = ({setting, setSetting}) => {
    const {mutateAsync: uploadImage} = useUploadImage();
    const handleError = useHandleError();

    const handleImageUpload = async (file: File) => {
        try {
            const imageUrl = getImageUrl(await uploadImage({file}));
            setSetting(imageUrl);
        } catch (e) {
            handleError(e);
        }
    };

    switch (setting.type) {
    case 'text':
        return (
            <TextField
                hint={setting.description}
                title={humanizeSettingKey(setting.key)}
                value={setting.value || ''}
                onChange={event => setSetting(event.target.value)}
            />
        );
    case 'boolean':
        return (
            <Toggle
                checked={setting.value}
                direction="rtl"
                hint={setting.description}
                label={humanizeSettingKey(setting.key)}
                onChange={event => setSetting(event.target.checked)}
            />
        );
    case 'select':
        return (
            <Select
                hint={setting.description}
                options={setting.options.map(option => ({label: option, value: option}))}
                selectedOption={{label: setting.value, value: setting.value}}
                testId={`setting-select-${setting.key}`}
                title={humanizeSettingKey(setting.key)}
                onSelect={option => setSetting(option?.value || null)}
            />
        );
    case 'color':
        return (
            <ColorPickerField
                debounceMs={200}
                direction='rtl'
                hint={setting.description}
                title={humanizeSettingKey(setting.key)}
                value={setting.value || ''}
                onChange={value => setSetting(value)}
            />
        );
    case 'image':
        return <>
            <Heading useLabelTag>{humanizeSettingKey(setting.key)}</Heading>
            <ImageUpload
                height={setting.value ? '100px' : '32px'}
                id={`custom-${setting.key}`}
                imageURL={setting.value || ''}
                onDelete={() => setSetting(null)}
                onUpload={file => handleImageUpload(file)}
            >Upload image</ImageUpload>
            {setting.description && <Hint>{setting.description}</Hint>}
        </>;
    }
};

const ThemeSettings: React.FC<{ settings: CustomThemeSetting[], updateSetting: (setting: CustomThemeSetting) => void }> = ({settings, updateSetting}) => {
    // Filter out custom theme settings that should not be visible
    const settingsKeyValueObj = settings.reduce((obj, {key, value}) => ({...obj, [key]: value}), {});
    const filteredSettings = settings.filter(setting => isCustomThemeSettingVisible(setting, settingsKeyValueObj));

    return (
        <SettingGroupContent className='mt-7'>
            {filteredSettings.map(setting => <ThemeSetting key={setting.key} setSetting={value => updateSetting({...setting, value} as CustomThemeSetting)} setting={setting} />)}
        </SettingGroupContent>
    );
};

export default ThemeSettings;
