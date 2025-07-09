import React, {useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import usePinturaEditor from '../../../hooks/usePinturaEditor';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {FacebookLogo, GoogleLogo, Icon, ImageUpload, SettingGroupContent, TabView, TextField, XLogo, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

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
            <div className='-mx-5 -mb-5 overflow-hidden rounded-b-xl bg-grey-50 px-5 pt-2 md:-mx-7 md:-mb-7 md:px-7 md:pt-7 dark:bg-grey-950'>
                <div className='-mt-4 mb-2 text-xs uppercase text-grey-500 dark:text-grey-800'>Preview</div>
                <div className='rounded-t-sm bg-white px-5 py-3 shadow-lg dark:bg-grey-975'>
                    <div className='mt-3 flex items-center'>
                        <div>
                            <GoogleLogo className='mr-7 h-7' />
                        </div>
                        <div className='grow'>
                            <div className='flex w-full items-center justify-end rounded-full bg-white p-3 px-4 shadow dark:bg-grey-900'>
                                <Icon className='stroke-[2px] text-blue-600' name='magnifying-glass' size='sm' />
                            </div>
                        </div>
                    </div>
                    <div className='mt-4 flex items-center gap-2 border-t border-grey-200 pt-4 dark:border-grey-900'>
                        <div className='flex size-7 items-center justify-center rounded-full bg-grey-200 dark:bg-grey-700' style={{
                            backgroundImage: icon ? `url(${icon})` : 'none',
                            backgroundSize: 'contain'
                        }}>
                        </div>
                        <div className='flex flex-col text-sm'>
                            <span>{siteDomain}</span>
                            <span className='-mt-0.5 inline-block text-xs text-grey-600'>{siteUrl}</span>
                        </div>
                    </div>
                    <div className='mt-1 flex flex-col'>
                        <span className='text-lg text-[#1a0dab] dark:text-blue'>{title}</span>
                        <span className='text-sm text-grey-900 dark:text-grey-700'>{description}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SEOMeta: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        saveState,
        siteData,
        focusRef,
        isEditing,
        handleSave,
        handleCancel,
        handleEditingChange,
        updateSetting
    } = useSettingGroup();

    const handleError = useHandleError();
    const {mutateAsync: uploadImage} = useUploadImage();
    const editor = usePinturaEditor();

    // Get all settings needed for all tabs
    const [
        metaTitle,
        metaDescription,
        siteTitle,
        siteDescription,
        facebookTitle,
        facebookDescription,
        facebookImage,
        twitterTitle,
        twitterDescription,
        twitterImage
    ] = getSettingValues(localSettings, [
        'meta_title',
        'meta_description',
        'title',
        'description',
        'og_title',
        'og_description',
        'og_image',
        'twitter_title',
        'twitter_description',
        'twitter_image'
    ]).map(value => value || '') as string[];

    // Tab management
    const [selectedTab, setSelectedTab] = useState('metadata');

    const createSettingHandler = (settingKey: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting(settingKey, e.target.value);
        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const createImageUploadHandler = (settingKey: string) => async (file: File) => {
        try {
            const imageUrl = getImageUrl(await uploadImage({file}));
            updateSetting(settingKey, imageUrl);
            if (!isEditing) {
                handleEditingChange(true);
            }
        } catch (e) {
            const error = e as APIError;
            if (error.response!.status === 415) {
                error.message = 'Unsupported file type';
            }
            handleError(error);
        }
    };

    const createImageDeleteHandler = (settingKey: string) => () => {
        updateSetting(settingKey, '');
        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    // Meta data handlers
    const handleMetaTitleChange = createSettingHandler('meta_title');
    const handleMetaDescriptionChange = createSettingHandler('meta_description');

    // Facebook handlers
    const handleFacebookTitleChange = createSettingHandler('og_title');
    const handleFacebookDescriptionChange = createSettingHandler('og_description');
    const handleFacebookImageUpload = createImageUploadHandler('og_image');
    const handleFacebookImageDelete = createImageDeleteHandler('og_image');

    // Twitter handlers
    const handleTwitterTitleChange = createSettingHandler('twitter_title');
    const handleTwitterDescriptionChange = createSettingHandler('twitter_description');
    const handleTwitterImageUpload = createImageUploadHandler('twitter_image');
    const handleTwitterImageDelete = createImageDeleteHandler('twitter_image');

    // Tab contents
    const metadataTabContent = (
        <>
            <SettingGroupContent className="my-6 gap-3">
                <TextField
                    hint="Recommended: 70 characters"
                    inputRef={focusRef}
                    maxLength={300}
                    placeholder={siteTitle}
                    title="Meta title"
                    value={metaTitle}
                    onChange={handleMetaTitleChange}
                />
                <TextField
                    hint="Recommended: 156 characters"
                    maxLength={500}
                    placeholder={siteDescription}
                    title="Meta description"
                    value={metaDescription}
                    onChange={handleMetaDescriptionChange}
                />
            </SettingGroupContent>
            <SearchEnginePreview
                description={metaDescription ? metaDescription : siteDescription}
                icon={siteData?.icon}
                title={metaTitle ? metaTitle : siteTitle}
                url={siteData?.url}
            />
        </>
    );

    const facebookTabContent = (
        <div className="mt-6 md:mx-[52px]">
            <div className="mb-4 flex items-center gap-2">
                <div>
                    <FacebookLogo className='size-10' />
                </div>
                <div>
                    <div className="mb-1 font-semibold leading-none text-grey-900 dark:text-grey-300">{siteTitle}</div>
                    <div className="leading-none text-grey-700">2h</div>
                </div>
            </div>
            <div>
                <div className="mb-2 h-3 w-full rounded bg-grey-200 dark:bg-grey-900"></div>
                <div className="mb-4 h-3 w-3/5 rounded bg-grey-200 dark:bg-grey-900"></div>
                <SettingGroupContent className="overflow-hidden rounded-md border border-grey-300 dark:border-grey-900">
                    <ImageUpload
                        fileUploadClassName='flex cursor-pointer items-center justify-center rounded rounded-b-none border border-grey-100 border-b-0 bg-grey-75 p-3 text-sm font-semibold text-grey-800 hover:text-black dark:border-grey-900'
                        height='300px'
                        id='facebook-image'
                        imageURL={facebookImage}
                        pintura={
                            {
                                isEnabled: editor.isEnabled,
                                openEditor: async () => editor.openEditor({
                                    image: facebookImage || '',
                                    handleSave: async (file:File) => {
                                        const imageUrl = getImageUrl(await uploadImage({file}));
                                        updateSetting('og_image', imageUrl);
                                    }
                                })
                            }
                        }
                        onDelete={handleFacebookImageDelete}
                        onUpload={handleFacebookImageUpload}
                    >
                        Upload Facebook image
                    </ImageUpload>
                    <div className="mt-5 flex flex-col gap-x-6 gap-y-7 px-4 pb-7">
                        <TextField
                            maxLength={300}
                            placeholder={siteTitle}
                            title="Facebook title"
                            value={facebookTitle}
                            onChange={handleFacebookTitleChange}
                        />
                        <TextField
                            maxLength={300}
                            placeholder={siteDescription}
                            title="Facebook description"
                            value={facebookDescription}
                            onChange={handleFacebookDescriptionChange}
                        />
                    </div>
                </SettingGroupContent>
            </div>
        </div>
    );

    const twitterTabContent = (
        <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <div className="pt-1">
                <XLogo className='-mb-1 size-10' />
            </div>
            <div className="w-full md:mr-[52px]">
                <div className="mb-2">
                    <span className="mr-1 font-semibold text-grey-900 dark:text-grey-300">{siteTitle}</span>
                    <span className="text-grey-700">&#183; 2h</span>
                </div>
                <div className="mb-2 h-3 w-full rounded bg-grey-200 dark:bg-grey-900"></div>
                <div className="mb-4 h-3 w-3/5 rounded bg-grey-200 dark:bg-grey-900"></div>
                <SettingGroupContent className="overflow-hidden rounded-md border border-grey-300 dark:border-grey-900">
                    <ImageUpload
                        fileUploadClassName='flex cursor-pointer items-center justify-center rounded rounded-b-none border border-grey-100 border-b-0 bg-grey-75 p-3 text-sm font-semibold text-grey-800 hover:text-black dark:border-grey-900'
                        height='300px'
                        id='twitter-image'
                        imageURL={twitterImage}
                        pintura={
                            {
                                isEnabled: editor.isEnabled,
                                openEditor: async () => editor.openEditor({
                                    image: twitterImage || '',
                                    handleSave: async (file:File) => {
                                        const imageUrl = getImageUrl(await uploadImage({file}));
                                        updateSetting('twitter_image', imageUrl);
                                    }
                                })
                            }
                        }
                        onDelete={handleTwitterImageDelete}
                        onUpload={handleTwitterImageUpload}
                    >
                        Upload X image
                    </ImageUpload>
                    <div className="mt-6 flex flex-col gap-x-6 gap-y-7 px-4 pb-7">
                        <TextField
                            maxLength={300}
                            placeholder={siteTitle}
                            title="X title"
                            value={twitterTitle}
                            onChange={handleTwitterTitleChange}
                        />
                        <TextField
                            maxLength={300}
                            placeholder={siteDescription}
                            title="X description"
                            value={twitterDescription}
                            onChange={handleTwitterDescriptionChange}
                        />
                    </div>
                </SettingGroupContent>
            </div>
        </div>
    );

    const tabs = [
        {
            id: 'metadata',
            title: 'Search',
            contents: metadataTabContent
        },
        {
            id: 'twitter',
            title: 'X card',
            contents: twitterTabContent
        },
        {
            id: 'facebook',
            title: 'Facebook card',
            contents: facebookTabContent
        }
    ];

    return (
        <TopLevelGroup
            description='Extra content for search engines and social accounts'
            isEditing={isEditing}
            keywords={keywords}
            navid='metadata'
            saveState={saveState}
            testId='seometa'
            title='Meta data'
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <TabView
                selectedTab={selectedTab}
                tabs={tabs}
                testId='seo-tabview'
                onTabChange={setSelectedTab}
            />
        </TopLevelGroup>
    );
};

export default withErrorBoundary(SEOMeta, 'SEO meta');
