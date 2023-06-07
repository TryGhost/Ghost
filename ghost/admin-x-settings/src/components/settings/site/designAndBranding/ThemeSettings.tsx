import Heading from '../../../../admin-x-ds/global/Heading';
import ImageUpload from '../../../../admin-x-ds/global/ImageUpload';
import React, {useContext} from 'react';
import Select from '../../../../admin-x-ds/global/Select';
import SettingGroupContent from '../../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../../admin-x-ds/global/TextField';
import Toggle from '../../../../admin-x-ds/global/Toggle';
import {CustomThemeSetting} from '../../../../types/api';
import {ServicesContext} from '../../../providers/ServiceProvider';
import {humanizeSettingKey} from '../../../../utils/helpers';

const ThemeSetting: React.FC<{
    setting: CustomThemeSetting,
    setSetting: <Setting extends CustomThemeSetting>(value: Setting['value']) => void
}> = ({setting, setSetting}) => {
    const {fileService} = useContext(ServicesContext);

    const handleImageUpload = async (file: File) => {
        const imageUrl = await fileService!.uploadImage(file);
        setSetting(imageUrl);
    };

    switch (setting.type) {
    case 'text':
        return (
            <TextField
                title={humanizeSettingKey(setting.key)}
                value={setting.value || ''}
                onChange={event => setSetting(event.target.value)}
            />
        );
    case 'boolean':
        return (
            <Toggle
                direction="rtl"
                id={`theme-setting-${setting.key}`}
                label={humanizeSettingKey(setting.key)}
                onChange={event => setSetting(event.target.checked)}
            />
        );
    case 'select':
        return (
            <Select
                defaultSelectedOption={setting.value}
                options={setting.options.map(option => ({label: option, value: option}))}
                title={humanizeSettingKey(setting.key)}
                onSelect={value => setSetting(value)}
            />
        );
    case 'color':
        return (
            <TextField
                title={humanizeSettingKey(setting.key)}
                type='color'
                value={setting.value || ''}
                onChange={event => setSetting(event.target.value)}
            />
        );
    case 'image':
        return <>
            <Heading useLabelTag>{humanizeSettingKey(setting.key)}</Heading>
            <ImageUpload
                height={setting.value ? '100px' : '32px'}
                id='cover-image'
                imageURL={setting.value || ''}
                onDelete={() => setSetting(null)}
                onUpload={file => handleImageUpload(file)}
            >Upload image</ImageUpload>
        </>;
    }
};

const ThemeSettings: React.FC<{ settings: CustomThemeSetting[], updateSetting: (setting: CustomThemeSetting) => void }> = ({settings, updateSetting}) => {
    return (
        <SettingGroupContent className='mt-7'>
            {settings.map(setting => <ThemeSetting key={setting.key} setSetting={(value: any) => updateSetting({...setting, value})} setting={setting} />)}
        </SettingGroupContent>
    );
};

export default ThemeSettings;
