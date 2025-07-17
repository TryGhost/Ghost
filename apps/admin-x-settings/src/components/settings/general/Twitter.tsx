import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import usePinturaEditor from '../../../hooks/usePinturaEditor';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {ImageUpload, SettingGroupContent, TextField, XLogo, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const Twitter: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        focusRef,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();
    const handleError = useHandleError();

    const {mutateAsync: uploadImage} = useUploadImage();

    const editor = usePinturaEditor();

    const [
        twitterTitle, twitterDescription, twitterImage, siteTitle, siteDescription
    ] = getSettingValues(localSettings, ['twitter_title', 'twitter_description', 'twitter_image', 'title', 'description']) as string[];

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('twitter_title', e.target.value);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('twitter_description', e.target.value);
    };

    const handleImageUpload = async (file: File) => {
        try {
            const imageUrl = getImageUrl(await uploadImage({file}));
            updateSetting('twitter_image', imageUrl);
        } catch (e) {
            const error = e as APIError;
            if (error.response!.status === 415) {
                error.message = 'Unsupported file type';
            }
            handleError(error);
        }
    };

    const handleImageDelete = () => {
        updateSetting('twitter_image', '');
    };

    const values = (
        <></>
    );

    const inputFields = (
        <div className="flex flex-col gap-3 md:flex-row">
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
                        onDelete={handleImageDelete}
                        onUpload={handleImageUpload}
                    >
                        Upload Twitter image
                    </ImageUpload>
                    <div className="flex flex-col gap-x-6 gap-y-7 px-4 pb-7">
                        <TextField
                            inputRef={focusRef}
                            maxLength={300}
                            placeholder={siteTitle}
                            title="X title"
                            value={twitterTitle}
                            onChange={handleTitleChange}
                        />
                        <TextField
                            maxLength={300}
                            placeholder={siteDescription}
                            title="X description"
                            value={twitterDescription}
                            onChange={handleDescriptionChange}
                        />
                    </div>
                </SettingGroupContent>
            </div>
        </div>
    );

    return (
        <TopLevelGroup
            description='Customize structured data of your site for X'
            isEditing={isEditing}
            keywords={keywords}
            navid='twitter'
            saveState={saveState}
            testId='twitter'
            title='X card'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {values}
            {isEditing ? inputFields : null}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Twitter, 'Twitter card');
