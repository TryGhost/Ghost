import Heading from '../../../../admin-x-ds/global/Heading';
import Hint from '../../../../admin-x-ds/global/Hint';
import ImageUpload from '../../../../admin-x-ds/global/form/ImageUpload';
import React, {useContext} from 'react';
import SettingGroupContent from '../../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../../admin-x-ds/global/form/TextField';
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
                    <Heading grey={true} level={6}>Accent color</Heading>
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
                <div className={`flex justify-between ${values.icon ? 'items-start ' : 'items-end'}`}>
                    <div>
                        <Heading grey={(values.icon ? true : false)} level={6}>Publication icon</Heading>
                        <Hint className='mr-5 max-w-[160px]'>A square, social icon, at least 60x60px</Hint>
                    </div>
                    <div className='flex gap-3'>
                        <ImageUpload
                            deleteButtonClassName='!top-1 !right-1'
                            height={values.icon ? '66px' : '36px'}
                            id='logo'
                            imageBWCheckedBg={true}
                            imageURL={values.icon || ''}
                            width={values.icon ? '66px' : '150px'}
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
                    <Heading className='mb-2' grey={(values.logo ? true : false)} level={6}>Publication logo</Heading>
                    <ImageUpload
                        deleteButtonClassName='!top-1 !right-1'
                        height='80px'
                        id='site-logo'
                        imageBWCheckedBg={true}
                        imageFit='contain'
                        imageURL={values.logo || ''}
                        onDelete={() => updateSetting('logo', null)}
                        onUpload={async (file) => {
                            updateSetting('logo', await fileService!.uploadImage(file));
                        }}
                    >
                    Upload logo
                    </ImageUpload>
                </div>
                <div>
                    <Heading className='mb-2' grey={(values.coverImage ? true : false)} level={6}>Publication cover</Heading>
                    <ImageUpload
                        deleteButtonClassName='!top-1 !right-1'
                        height='180px'
                        id='cover'
                        imageURL={values.coverImage || ''}
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
