import ImageUpload from '../../../admin-x-ds/global/form/ImageUpload';
import React, {useContext} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextArea from '../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../admin-x-ds/global/form/TextField';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {FileService, ServicesContext} from '../../providers/ServiceProvider';
import {ReactComponent as TwitterLogo} from '../../../admin-x-ds/assets/images/twitter-logo.svg';
import {getSettingValues} from '../../../utils/helpers';

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

    const {fileService} = useContext(ServicesContext) as {fileService: FileService};

    const [
        twitterTitle, twitterDescription, twitterImage, siteTitle, siteDescription
    ] = getSettingValues(localSettings, ['twitter_title', 'twitter_description', 'twitter_image', 'title', 'description']) as string[];

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('twitter_title', e.target.value);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateSetting('twitter_description', e.target.value);
    };

    const handleImageUpload = async (file: File) => {
        try {
            const imageUrl = await fileService.uploadImage(file);
            updateSetting('twitter_image', imageUrl);
        } catch (err: any) {
            // handle error
        }
    };

    const handleImageDelete = () => {
        updateSetting('twitter_image', '');
    };

    const values = (
        <></>
    );

    const inputFields = (
        <div className="flex gap-3">
            <div className="pt-1">
                <TwitterLogo className='-mb-1 h-10 w-10' />
            </div>
            <div className="mr-[52px] w-full">
                <div className="mb-2">
                    <span className="mr-1 font-semibold text-grey-900">{siteTitle}</span>
                    <span className="text-grey-700">&#183; 2h</span>
                </div>
                <div className="mb-2 h-3 w-full rounded bg-grey-200"></div>
                <div className="mb-4 h-3 w-3/5 rounded bg-grey-200"></div>
                <SettingGroupContent className="overflow-hidden rounded-md border border-grey-300">
                    <ImageUpload
                        fileUploadClassName='flex cursor-pointer items-center justify-center rounded rounded-b-none border border-grey-100 border-b-0 bg-grey-75 p-3 text-sm font-semibold text-grey-800 hover:text-black'
                        height='300px'
                        id='twitter-image'
                        imageURL={twitterImage}
                        onDelete={handleImageDelete}
                        onUpload={handleImageUpload}
                    >
                        Upload Twitter image
                    </ImageUpload>
                    <div className="flex flex-col gap-x-6 gap-y-7 px-4 pb-7">
                        <TextField
                            clearBg={true}
                            inputRef={focusRef}
                            placeholder={siteTitle}
                            title="Twitter title"
                            value={twitterTitle}
                            onChange={handleTitleChange}
                        />
                        <TextArea
                            clearBg={true}
                            placeholder={siteDescription}
                            rows={2}
                            title="Twitter description"
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
            description='Customize structured data of your site'
            isEditing={isEditing}
            keywords={keywords}
            navid='twitter'
            saveState={saveState}
            testId='twitter'
            title='Twitter card'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {values}
            {isEditing ? inputFields : null}
        </SettingGroup>
    );
};

export default Twitter;
