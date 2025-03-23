import React, {useState} from 'react';
import clsx from 'clsx';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {Form, Heading, Icon, ImageUpload, Select, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {ReactComponent as PortalIcon1} from '../../../../assets/icons/portal-icon-1.svg';
import {ReactComponent as PortalIcon2} from '../../../../assets/icons/portal-icon-2.svg';
import {ReactComponent as PortalIcon3} from '../../../../assets/icons/portal-icon-3.svg';
import {ReactComponent as PortalIcon4} from '../../../../assets/icons/portal-icon-4.svg';
import {ReactComponent as PortalIcon5} from '../../../../assets/icons/portal-icon-5.svg';
import {Setting, SettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const defaultButtonIcons = [
    {
        Component: PortalIcon1,
        value: 'icon-1'
    },
    {
        Component: PortalIcon2,
        value: 'icon-2'
    },
    {
        Component: PortalIcon3,
        value: 'icon-3'
    },
    {
        Component: PortalIcon4,
        value: 'icon-4'
    },
    {
        Component: PortalIcon5,
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
        updateSetting('portal_button_icon', null);
        setUploadedIcon(undefined);
    };

    const portalButtonOptions = [
        {value: 'icon-and-text', label: 'Icon and text'},
        {value: 'icon-only', label: 'Icon only'},
        {value: 'text-only', label: 'Text only'}
    ];

    return <div className='mt-7'><Form>
        <Toggle
            checked={Boolean(portalButton)}
            direction='rtl'
            label='Show portal button'
            onChange={e => updateSetting('portal_button', e.target.checked)}
        />
        <Select
            options={portalButtonOptions}
            selectedOption={portalButtonOptions.find(option => option.value === portalButtonStyle)}
            title='Button style'
            onSelect={option => updateSetting('portal_button_style', option?.value || null)}
        />
        {portalButtonStyle?.toString()?.includes('icon') &&
            <div className='flex flex-col gap-2'>
                <Heading level={6} grey>Icon</Heading>
                <div className='flex justify-between'>

                    {defaultButtonIcons.map(icon => (
                        <button className={clsx('border p-3', currentIcon === icon.value ? 'border-green' : 'border-transparent')} type="button" onClick={() => updateSetting('portal_button_icon', icon.value)}>
                            <icon.Component className={`h-5 w-5 ${currentIcon === icon.value ? 'text-green' : 'text-black opacity-70 transition-all hover:opacity-100 dark:text-white'}`} />
                        </button>
                    ))}
                    <div className={clsx('relative w-[46px] border', currentIcon === uploadedIcon ? 'border-green' : 'border-transparent')}>
                        <ImageUpload
                            deleteButtonClassName='invisible absolute -right-2 -top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[rgba(0,0,0,0.75)] text-white hover:bg-black group-hover:!visible'
                            deleteButtonContent={<Icon colorClass='text-white' name='trash' size='sm' />}
                            height='46px'
                            id='test'
                            imageClassName='cursor-pointer'
                            imageURL={uploadedIcon}
                            width='46px'
                            deleteButtonUnstyled
                            onDelete={handleImageDelete}
                            onImageClick={() => uploadedIcon && updateSetting('portal_button_icon', uploadedIcon)}
                            onUpload={handleImageUpload}
                        >
                            <Icon className='dark:text-white' name='upload' size='md' />
                        </ImageUpload>
                    </div>
                </div>
            </div>
        }
        {portalButtonStyle?.toString()?.includes('text') &&
            <TextField
                title='Signup button text'
                value={portalButtonSignupText as string}
                onChange={e => updateSetting('portal_button_signup_text', e.target.value)}
            />
        }
    </Form></div>;
};

export default LookAndFeel;
