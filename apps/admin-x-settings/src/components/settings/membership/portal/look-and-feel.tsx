import BrandIcon, {type BrandIconName} from '../../../icons/brand-icon';
import React, {useState} from 'react';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {Button, Field, FieldGroup, FieldLabel, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, ToggleGroup, ToggleGroupItem} from '@tryghost/shade/components';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {Inline, Text} from '@tryghost/shade/primitives';
import {type Setting, type SettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {Trash2, Upload} from 'lucide-react';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const defaultButtonIcons: Array<{icon: BrandIconName; label: string; value: string}> = [
    {
        icon: 'portal-icon-1',
        label: 'Portal icon 1',
        value: 'icon-1'
    },
    {
        icon: 'portal-icon-2',
        label: 'Portal icon 2',
        value: 'icon-2'
    },
    {
        icon: 'portal-icon-3',
        label: 'Portal icon 3',
        value: 'icon-3'
    },
    {
        icon: 'portal-icon-4',
        label: 'Portal icon 4',
        value: 'icon-4'
    },
    {
        icon: 'portal-icon-5',
        label: 'Portal icon 5',
        value: 'icon-5'
    }
];

const LookAndFeel: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
}> = ({localSettings, updateSetting}) => {
    const {mutateAsync: uploadImage} = useUploadImage();
    const handleError = useHandleError();

    const [portalButton, portalButtonStyle, portalButtonIcon, portalButtonSignupText] = getSettingValues(localSettings, ['portal_button', 'portal_button_style', 'portal_button_icon', 'portal_button_signup_text']);

    const currentIcon = portalButtonIcon as string || defaultButtonIcons[0].value;
    const isDefaultIcon = defaultButtonIcons.map(({value}) => value).includes(currentIcon);

    const [uploadedIcon, setUploadedIcon] = useState(isDefaultIcon ? undefined : currentIcon);

    const handleImageUpload = async (file: File) => {
        try {
            const imageUrl = getImageUrl(await uploadImage({file}));
            updateSetting('portal_button_icon', imageUrl);
            setUploadedIcon(imageUrl);
        } catch (e) {
            const error = e as APIError;
            if (error.response!.status === 415) {
                error.message = 'Unsupported file type';
            }
            handleError(error);
        }
    };

    const handleImageDelete = () => {
        if (currentIcon === uploadedIcon) {
            updateSetting('portal_button_icon', null);
        }
        setUploadedIcon(undefined);
    };

    const portalButtonOptions = [
        {value: 'icon-and-text', label: 'Icon and text'},
        {value: 'icon-only', label: 'Icon only'},
        {value: 'text-only', label: 'Text only'}
    ];

    return <div className='mt-7'><FieldGroup className='mb-10 gap-8 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
        <Field orientation='horizontal'>
            <FieldLabel htmlFor='show-portal-button'>Show portal button</FieldLabel>
            <Switch checked={Boolean(portalButton)} id='show-portal-button' onCheckedChange={checked => updateSetting('portal_button', checked)} />
        </Field>
        
        {portalButton && (
            <>
                <Field>
                    <FieldLabel>Button style</FieldLabel>
                    <Select value={portalButtonStyle as string} onValueChange={value => updateSetting('portal_button_style', value)}>
                        <SelectTrigger aria-label='Button style'><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {portalButtonOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </Field>
                {portalButtonStyle?.toString()?.includes('icon') &&
                    <div className='flex flex-col gap-2'>
                        <Text as='h6' className='text-base' weight='semibold'>Icon</Text>
                        <Inline className='w-full' gap='none' justify='between'>
                            <ToggleGroup
                                aria-label='Portal button icon'
                                className='contents border-0! bg-transparent! p-0'
                                type='single'
                                value={currentIcon}
                                onValueChange={value => value && updateSetting('portal_button_icon', value)}
                            >
                                {defaultButtonIcons.map(iconConfig => (
                                    <ToggleGroupItem key={iconConfig.value} aria-label={iconConfig.label} className='group size-[46px] border border-transparent p-3 hover:bg-transparent data-[state=on]:border-primary data-[state=on]:bg-transparent data-[state=on]:text-primary data-[state=on]:shadow-none' value={iconConfig.value}>
                                        <BrandIcon className='size-[18px] opacity-70 transition-opacity group-hover:opacity-100 group-data-[state=on]:opacity-100' name={iconConfig.icon} />
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <ImageUpload className={`size-[46px] overflow-visible border ${currentIcon === uploadedIcon ? 'border-primary' : 'border-transparent'}`}>
                                {uploadedIcon ? (
                                    <ImageUploadPreview>
                                        <ImageUploadImage src={uploadedIcon} />
                                        <Button
                                            aria-label='Use uploaded Portal icon'
                                            aria-pressed={currentIcon === uploadedIcon}
                                            className='absolute inset-0 z-10 size-full rounded-none bg-transparent'
                                            size='icon'
                                            type='button'
                                            variant='ghost'
                                            onClick={() => updateSetting('portal_button_icon', uploadedIcon)}
                                        />
                                        <ImageUploadActions className='-top-2 -right-2 z-20 opacity-100'>
                                            <ImageUploadAction aria-label='Delete uploaded Portal icon' className='size-6 rounded-full p-0' onClick={handleImageDelete}>
                                                <Trash2 />
                                            </ImageUploadAction>
                                        </ImageUploadActions>
                                    </ImageUploadPreview>
                                ) : (
                                    <ImageUploadDropzone accept={{'image/*': []}} aria-label='Upload Portal icon' className='size-full p-0' inputAriaLabel='Upload Portal icon' onDropAccepted={files => handleImageUpload(files[0])}>
                                        <Upload className='size-5' />
                                    </ImageUploadDropzone>
                                )}
                            </ImageUpload>
                        </Inline>
                    </div>
                }
                {portalButtonStyle?.toString()?.includes('text') &&
                    <Field>
                        <FieldLabel htmlFor='portal-signup-button-text'>Signup button text</FieldLabel>
                        <Input id='portal-signup-button-text' value={portalButtonSignupText as string} onChange={e => updateSetting('portal_button_signup_text', e.target.value)} />
                    </Field>
                }
            </>
        )}
    </FieldGroup></div>;
};

export default LookAndFeel;
