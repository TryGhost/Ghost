import ImageUpload from '../../../admin-x-ds/global/ImageUpload';
import React, {useContext} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/TextField';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {FileService, ServicesContext} from '../../providers/ServiceProvider';

const Twitter: React.FC = () => {
    const {
        currentState,
        saveState,
        focusRef,
        handleSave,
        handleCancel,
        updateSetting,
        getSettingValues,
        handleStateChange
    } = useSettingGroup();

    const {fileService} = useContext(ServicesContext) as {fileService: FileService};

    const [
        twitterTitle, twitterDescription, twitterImage, siteTitle, siteDescription
    ] = getSettingValues(['twitter_title', 'twitter_description', 'twitter_image', 'title', 'description']) as string[];

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('twitter_title', e.target.value);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <SettingGroupContent>
            <ImageUpload
                height='200px'
                id='twitter-image'
                imageURL={twitterImage}
                label='Upload twitter image'
                onDelete={handleImageDelete}
                onUpload={handleImageUpload}
            />
            <TextField
                inputRef={focusRef}
                placeholder={siteTitle}
                title="Twitter title"
                value={twitterTitle}
                onChange={handleTitleChange}
            />
            <TextField
                placeholder={siteDescription}
                title="Twitter description"
                value={twitterDescription}
                onChange={handleDescriptionChange}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description='Customize structured data of your site'
            navid='twitter'
            saveState={saveState}
            state={currentState}
            title='Twitter card'
            onCancel={handleCancel}
            onSave={handleSave}
            onStateChange={handleStateChange}
        >
            {values}
            {currentState !== 'view' ? inputFields : ''}
        </SettingGroup>
    );
};

export default Twitter;