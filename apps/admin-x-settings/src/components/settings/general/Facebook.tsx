import ImageUpload from '../../../admin-x-ds/global/form/ImageUpload';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/form/TextField';
import useHandleError from '../../../utils/api/handleError';
import usePinturaEditor from '../../../hooks/usePinturaEditor';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {ReactComponent as FacebookLogo} from '../../../admin-x-ds/assets/images/facebook-logo.svg';
import {getImageUrl, useUploadImage} from '../../../api/images';
import {getSettingValues} from '../../../api/settings';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

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
    const [pinturaJsUrl] = getSettingValues<string>(localSettings, ['pintura_js_url']);
    const [pinturaCssUrl] = getSettingValues<string>(localSettings, ['pintura_css_url']);
    // const [showUnsplash, setShowUnsplash] = useState<boolean>(false);
    const handleError = useHandleError();

    const editor = usePinturaEditor(
        {config: {
            jsUrl: pinturaJsUrl || '',
            cssUrl: pinturaCssUrl || ''
        }}
    );

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
            handleError(e);
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
                            placeholder={siteTitle}
                            title="Facebook title"
                            value={facebookTitle}
                            onChange={handleTitleChange}
                        />
                        <TextField
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
        <SettingGroup
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
        </SettingGroup>
    );
};

export default withErrorBoundary(Facebook, 'Facebook card');
