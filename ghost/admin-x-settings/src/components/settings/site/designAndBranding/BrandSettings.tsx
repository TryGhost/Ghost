import Heading from '../../../../admin-x-ds/global/Heading';
import Hint from '../../../../admin-x-ds/global/Hint';
import ImageUpload from '../../../../admin-x-ds/global/ImageUpload';
import React from 'react';
import SettingGroupContent from '../../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../../admin-x-ds/global/TextField';
import useSettingGroup from '../../../../hooks/useSettingGroup';

const BrandSettings: React.FC = () => {
    const {
        getSettingValues
    } = useSettingGroup();

    const [description, accentColor] = getSettingValues(['description', 'accent_color']) as string[];

    return (
        <div className='mt-7'>
            <SettingGroupContent>
                <TextField
                    key='site-description'
                    clearBg={true}
                    hint='Used in your theme, meta data and search results'
                    title='Site description'
                    value={description}
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
                            value={accentColor}
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
                            onDelete={() => {}}
                            onUpload={() => {}}
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
                        onDelete={() => {}}
                        onUpload={() => {}}
                    >
                    Upload logo
                    </ImageUpload>
                </div>
                <div>
                    <Heading className='mb-2' level={6}>Publication cover</Heading>
                    <ImageUpload
                        height='140px'
                        id='cover'
                        onDelete={() => {}}
                        onUpload={() => {}}
                    >
                    Upload cover
                    </ImageUpload>
                </div>
            </SettingGroupContent>
        </div>
    );
};

export default BrandSettings;