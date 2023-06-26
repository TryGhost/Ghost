import Heading from '../../../admin-x-ds/global/Heading';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/form/TextField';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {ReactComponent as GoogleLogo} from '../../../admin-x-ds/assets/images/google-logo.svg';
import {ReactComponent as MagnifyingGlass} from '../../../admin-x-ds/assets/icons/magnifying-glass.svg';
import {getSettingValues} from '../../../utils/helpers';

interface SearchEnginePreviewProps {
    title: string;
    description: string;
    icon?: string;
    url?: string;
}

const SearchEnginePreview: React.FC<SearchEnginePreviewProps> = ({
    title,
    description,
    icon,
    url
}) => {
    const siteUrl = url?.replace(/\/$/, '');
    const siteDomain = siteUrl?.replace(/^https?:\/\//, '').replace(/\/?$/, '');

    return (
        <div>
            <Heading grey={true} level={6}>Search engine result preview</Heading>
            <div className='mt-3 flex items-center'>
                <div className='basis-'>
                    <GoogleLogo className='mr-7 h-7' />
                </div>
                <div className='grow'>
                    <div className='flex w-full items-center justify-end rounded-full bg-white p-3 px-4 shadow'>
                        <MagnifyingGlass className='h-4 w-4 text-blue-600' style={{strokeWidth: '2px'}} />
                    </div>
                </div>
            </div>
            <div className='mt-4 flex items-center gap-2 border-t border-grey-200 pt-4'>
                <div className='flex h-7 w-7 items-center justify-center rounded-full bg-grey-200' style={{
                    backgroundImage: icon ? `url(${icon})` : 'none'
                }}>
                </div>
                <div className='flex flex-col text-sm'>
                    <span>{siteDomain}</span>
                    <span className='-mt-0.5 inline-block text-xs text-grey-600'>{siteUrl}</span>
                </div>
            </div>
            <div className='mt-1 flex flex-col'>
                <span className='text-lg text-[#1a0dab]'>{title}</span>
                <span className='text-sm text-grey-900'>{description}</span>
            </div>
        </div>
    );
};

const Metadata: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        siteData,
        focusRef,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [metaTitle, metaDescription, siteTitle, siteDescription] = getSettingValues(localSettings, ['meta_title', 'meta_description', 'title', 'description']) as string[];

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('meta_title', e.target.value);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('meta_description', e.target.value);
    };

    const inputFields = (
        <SettingGroupContent>
            <TextField
                hint="Recommended: 70 characters"
                inputRef={focusRef}
                placeholder={siteTitle}
                title="Meta title"
                value={metaTitle}
                onChange={handleTitleChange}
            />
            <TextField
                hint="Recommended: 156 characters"
                placeholder={siteDescription}
                title="Meta description"
                value={metaDescription}
                onChange={handleDescriptionChange}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description='Extra content for search engines'
            isEditing={isEditing}
            keywords={keywords}
            navid='metadata'
            saveState={saveState}
            testId='metadata'
            title='Metadata'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <SearchEnginePreview
                description={metaDescription ? metaDescription : siteDescription}
                icon={siteData?.icon}
                title={metaTitle ? metaTitle : siteTitle}
                url={siteData?.url}
            />
            {isEditing ? inputFields : null}
        </SettingGroup>
    );
};

export default Metadata;
