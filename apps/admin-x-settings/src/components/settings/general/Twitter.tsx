import ImageUpload from '../../../admin-x-ds/global/form/ImageUpload';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/form/TextField';
import useHandleError from '../../../utils/api/handleError';
import usePinturaEditor from '../../../hooks/usePinturaEditor';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {ReactComponent as TwitterLogo} from '../../../admin-x-ds/assets/images/x-logo.svg';
import {getImageUrl, useUploadImage} from '../../../api/images';
import {getSettingValues} from '../../../api/settings';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

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

    const [pinturaJsUrl] = getSettingValues<string>(localSettings, ['pintura_js_url']);
    const [pinturaCssUrl] = getSettingValues<string>(localSettings, ['pintura_css_url']);

    const editor = usePinturaEditor(
        {config: {
            jsUrl: pinturaJsUrl || '',
            cssUrl: pinturaCssUrl || ''
        }}
    );

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
            handleError(e);
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
                <TwitterLogo className='-mb-1 h-10 w-10' />
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
                            placeholder={siteTitle}
                            title="X title"
                            value={twitterTitle}
                            onChange={handleTitleChange}
                        />
                        <TextField
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
        <SettingGroup
            description='Customize structured data of your site for X (formerly Twitter)'
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
        </SettingGroup>
    );
};

export default withErrorBoundary(Twitter, 'Twitter card');
