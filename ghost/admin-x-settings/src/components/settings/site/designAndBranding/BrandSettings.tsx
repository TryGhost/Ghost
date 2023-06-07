import Heading from '../../../../admin-x-ds/global/Heading';
import Hint from '../../../../admin-x-ds/global/Hint';
import ImageUpload from '../../../../admin-x-ds/global/ImageUpload';
import React, {useContext} from 'react';
import SettingGroupContent from '../../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../../admin-x-ds/global/TextField';
import {ServicesContext} from '../../../providers/ServiceProvider';
import {SettingValue} from '../../../../types/api';

export interface BrandSettingValues {
    description: string
    accentColor: string
    icon: string | null
    logo: string | null
    coverImage: string | null
}

const BrandSettings: React.FC<{ values: BrandSettingValues, updateSetting: (key: string, value: SettingValue) => void }> = ({values,updateSetting}) => {
    const {fileService} = useContext(ServicesContext);

    return (
        <div className='mt-7'>
            <SettingGroupContent>
                <TextField
                    key='site-description'
                    clearBg={true}
                    hint='Used in your theme, meta data and search results'
                    title='Site description'
                    value={values.description}
                    onChange={event => updateSetting('description', event.target.value)}
                />
                <div className='flex items-center justify-between gap-3'>
                    <Heading level={6}>Accent color</Heading>
                    <div className='relative max-w-[70px]'>
                        {/* <span className='absolute left-1 top-[9px] text-grey-600'>#</span> */}
                        <TextField
                            key='accent-color'
                            className='text-right'
                            clearBg={true}
                            maxLength={7}
                            type='color'
                            value={values.accentColor}
                            onChange={event => updateSetting('accent_color', event.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <Heading level={6}>Publication icon</Heading>
                    <div className='mt-2 flex gap-3'>
                        <Hint className='mr-5'>A square, social icon, at least 60x60px</Hint>
                        <ImageUpload
                            height='36px'
                            id='logo'
                            width='150px'
                            onDelete={() => updateSetting('icon', null)}
                            onUpload={async (file) => {
                                updateSetting('icon', await fileService!.uploadImage(file));
                            }}
                        >
                        Upload icon
                        </ImageUpload>
                    </div>
                </div>
                <div>
                    <Heading className='mb-2' level={6}>Publication logo</Heading>
                    <ImageUpload
                        height='80px'
                        id='logo'
                        onDelete={() => updateSetting('logo', null)}
                        onUpload={async (file) => {
                            updateSetting('logo', await fileService!.uploadImage(file));
                        }}
                    >
                    Upload logo
                    </ImageUpload>
                </div>
                <div>
                    <Heading className='mb-2' level={6}>Publication cover</Heading>
                    <ImageUpload
                        height='140px'
                        id='cover'
                        onDelete={() => updateSetting('cover_image', null)}
                        onUpload={async (file) => {
                            updateSetting('cover_image', await fileService!.uploadImage(file));
                        }}
                    >
                    Upload cover
                    </ImageUpload>
                </div>
            </SettingGroupContent>
        </div>
    );
};

export default BrandSettings;
