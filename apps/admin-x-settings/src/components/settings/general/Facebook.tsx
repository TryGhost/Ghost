import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import usePinturaEditor from '../../../hooks/usePinturaEditor';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {FacebookLogo, ImageUpload, SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const Facebook: React.FC<{ keywords: string[] }> = ({keywords}) => {
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

    const {mutateAsync: uploadImage} = useUploadImage();
    // const [unsplashEnabled] = getSettingValues<boolean>(localSettings, ['unsplash']);
    // const [showUnsplash, setShowUnsplash] = useState<boolean>(false);
    const handleError = useHandleError();

    const editor = usePinturaEditor();

    const [
        facebookTitle, facebookDescription, facebookImage, siteTitle, siteDescription
    ] = getSettingValues(localSettings, ['og_title', 'og_description', 'og_image', 'title', 'description']) as string[];

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('og_title', e.target.value);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('og_description', e.target.value);
    };

    const handleImageUpload = async (file: File) => {
        try {
            const imageUrl = getImageUrl(await uploadImage({file}));
            updateSetting('og_image', imageUrl);
        } catch (e) {
            const error = e as APIError;
            if (error.response!.status === 415) {
                error.message = 'Unsupported file type';
            }
            handleError(error);
        }
    };

    const handleImageDelete = () => {
        updateSetting('og_image', '');
    };

    const values = (
        <></>
    );

    const inputFields = (
        <div className="md:mx-[52px]">
            <div className="mb-4 flex items-center gap-2">
                <div>
                    <FacebookLogo className='h-10 w-10' />
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
                        onDelete={handleImageDelete}
                        onUpload={handleImageUpload}
                    >
                        Upload Facebook image
                    </ImageUpload>
                    <div className="flex flex-col gap-x-6 gap-y-7 px-4 pb-7">
                        <TextField
                            inputRef={focusRef}
                            maxLength={300}
                            placeholder={siteTitle}
                            title="Facebook title"
                            value={facebookTitle}
                            onChange={handleTitleChange}
                        />
                        <TextField
                            maxLength={300}
                            placeholder={siteDescription}
                            title="Facebook description"
                            value={facebookDescription}
                            onChange={handleDescriptionChange}
                        />
                    </div>
                </SettingGroupContent>
            </div>
        </div>
    );

    return (
        <TopLevelGroup
            description='Customize structured data of your site'
            isEditing={isEditing}
            keywords={keywords}
            navid='facebook'
            saveState={saveState}
            testId='facebook'
            title='Facebook card'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {values}
            {isEditing ? inputFields : null}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Facebook, 'Facebook card');
