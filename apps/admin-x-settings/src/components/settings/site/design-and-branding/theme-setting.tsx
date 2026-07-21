import React, {useEffect, useState} from 'react';
import {ColorPickerField, Heading, Hint, ImageUpload, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {type CustomThemeSetting} from '@tryghost/admin-x-framework/api/custom-theme-settings';
import {Field, FieldDescription, FieldLabel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {humanizeSettingKey} from '@tryghost/admin-x-framework/api/settings';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

interface ThemeSettingProps {
    setting: CustomThemeSetting;
    setSetting: <Setting extends CustomThemeSetting>(value: Setting['value']) => void;
}

const ThemeSetting: React.FC<ThemeSettingProps> = ({setting, setSetting}) => {
    const [fieldValues, setFieldValues] = useState<{ [key: string]: string | null }>({});
    useEffect(() => {
        const valueAsString = setting.value === null ? '' : String(setting.value);
        setFieldValues(values => ({...values, [setting.key]: valueAsString}));
    }, [setting]);

    const handleBlur = (key: string) => {
        if (fieldValues[key] !== undefined) {
            setSetting(fieldValues[key]);
        }
    };

    const handleChange = (key: string, value: string) => {
        setFieldValues(values => ({...values, [key]: value}));
    };
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
                value={fieldValues[setting.key] || ''}
                onBlur={() => handleBlur(setting.key)}
                onChange={event => handleChange(setting.key, event.target.value)}
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
            <Field>
                <FieldLabel>{humanizeSettingKey(setting.key)}</FieldLabel>
                <Select value={setting.value} onValueChange={setSetting}>
                    <SelectTrigger aria-label={humanizeSettingKey(setting.key)} data-testid={`setting-select-${setting.key}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {setting.options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    </SelectContent>
                </Select>
                {setting.description && <FieldDescription>{setting.description}</FieldDescription>}
            </Field>
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

export default ThemeSetting;
