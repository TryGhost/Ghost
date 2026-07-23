import ColorPickerField from '../../../color-picker-field';
import React, {useEffect, useState} from 'react';
import {type CustomThemeSetting} from '@tryghost/admin-x-framework/api/custom-theme-settings';
import {Field, FieldContent, FieldDescription, FieldLabel, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch} from '@tryghost/shade/components';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {Trash2} from 'lucide-react';
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
            <Field>
                <FieldLabel htmlFor={`theme-setting-${setting.key}`}>{humanizeSettingKey(setting.key)}</FieldLabel>
                <Input className='h-[var(--control-height)] border-transparent bg-muted' id={`theme-setting-${setting.key}`} value={fieldValues[setting.key] || ''} onBlur={() => handleBlur(setting.key)} onChange={event => handleChange(setting.key, event.target.value)} />
                {setting.description && <FieldDescription>{setting.description}</FieldDescription>}
            </Field>
        );
    case 'boolean':
        return (
            <Field orientation='horizontal'>
                <FieldContent>
                    <FieldLabel htmlFor={`theme-setting-${setting.key}`}>{humanizeSettingKey(setting.key)}</FieldLabel>
                    {setting.description && <FieldDescription>{setting.description}</FieldDescription>}
                </FieldContent>
                <Switch checked={Boolean(setting.value)} id={`theme-setting-${setting.key}`} onCheckedChange={setSetting} />
            </Field>
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
            <FieldLabel>{humanizeSettingKey(setting.key)}</FieldLabel>
            <ImageUpload className={setting.value ? 'h-25' : 'h-8'}>
                {setting.value ? (
                    <ImageUploadPreview>
                        <ImageUploadImage id={`custom-${setting.key}`} src={setting.value} />
                        <ImageUploadActions>
                            <ImageUploadAction aria-label='Remove image' onClick={() => setSetting(null)}>
                                <Trash2 />
                            </ImageUploadAction>
                        </ImageUploadActions>
                    </ImageUploadPreview>
                ) : (
                    <ImageUploadDropzone inputId={`custom-${setting.key}`} onDropAccepted={files => handleImageUpload(files[0])}>
                        Upload image
                    </ImageUploadDropzone>
                )}
            </ImageUpload>
            {setting.description && <FieldDescription>{setting.description}</FieldDescription>}
        </>;
    }
};

export default ThemeSetting;
