import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextArea from '../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../admin-x-ds/global/form/TextField';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {getSettingValues} from '../../../utils/helpers';

const TitleAndDescription: React.FC<{ keywords: string[] }> = ({keywords}) => {
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

    const [title, description] = getSettingValues(localSettings, ['title', 'description']) as string[];

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('title', e.target.value);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateSetting('description', e.target.value);
    };

    const values = (
        <SettingGroupContent
            columns={2}
            values={[
                {
                    heading: 'Site title',
                    key: 'site-title',
                    value: title
                },
                {
                    heading: 'Site description',
                    key: 'site-description',
                    value: description
                }
            ]}
        />
    );

    const inputFields = (
        <SettingGroupContent>
            <TextField
                hint="The name of your site"
                inputRef={focusRef}
                placeholder="Site title"
                title="Site title"
                value={title}
                onChange={handleTitleChange}
            />
            <TextArea
                hint="A short description, used in your theme, meta data and search results"
                placeholder="Site description"
                title="Site description"
                value={description}
                onChange={handleDescriptionChange} />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description='The details used to identify your publication around the web'
            isEditing={isEditing}
            keywords={keywords}
            navid='title-and-description'
            saveState={saveState}
            testId='title-and-description'
            title='Title & description'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? inputFields : values}
        </SettingGroup>
    );
};

export default TitleAndDescription;
