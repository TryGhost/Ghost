import ColorPickerField from '../../../../admin-x-ds/global/form/ColorPickerField';
import Heading from '../../../../admin-x-ds/global/Heading';
import Hint from '../../../../admin-x-ds/global/Hint';
import ImageUpload from '../../../../admin-x-ds/global/form/ImageUpload';
import React, {useRef, useState} from 'react';
import SettingGroupContent from '../../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import {SettingValue} from '../../../../api/settings';
import {debounce} from '../../../../utils/debounce';
import {getImageUrl, useUploadImage} from '../../../../api/images';

export interface BrandSettingValues {
    description: string
    accentColor: string
    icon: string | null
    logo: string | null
    coverImage: string | null
}

const BrandSettings: React.FC<{ values: BrandSettingValues, updateSetting: (key: string, value: SettingValue) => void }> = ({values,updateSetting}) => {
    const {mutateAsync: uploadImage} = useUploadImage();
    const [siteDescription, setSiteDescription] = useState(values.description);

    const updateDescriptionDebouncedRef = useRef(
        debounce((value: string) => {
            updateSetting('description', value);
        }, 500)
    );
    const updateSettingDebounced = debounce(updateSetting, 500);

    return (
        <div className='mt-7'>
            <SettingGroupContent>
                <TextField
                    key='site-description'
                    clearBg={true}
                    hint='Used in your theme, meta data and search results'
                    title='Site description'
                    value={siteDescription}
                    onChange={(event) => {
                        // Immediately update the local state
                        setSiteDescription(event.target.value);
                        // Debounce the updateSetting call
                        updateDescriptionDebouncedRef.current(event.target.value);
                    }}
                />
                <ColorPickerField
                    direction='rtl'
                    title={<Heading className='mt-[3px]' grey={true} level={6}>Accent color</Heading>}
                    value={values.accentColor}
                    // we debounce this because the color picker fires a lot of events.
                    onChange={value => updateSettingDebounced('accent_color', value)}
                />
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
                                updateSetting('icon', getImageUrl(await uploadImage({file})));
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
                            updateSetting('logo', getImageUrl(await uploadImage({file})));
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
                            updateSetting('cover_image', getImageUrl(await uploadImage({file})));
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
