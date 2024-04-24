import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

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

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                maxLength={150}
                placeholder="Site title"
                title="Site title"
                value={title}
                onChange={handleTitleChange}
            />
            <TextField
                hint="A short description, used in your theme, meta data and search results"
                maxLength={200}
                placeholder="Site description"
                title="Site description"
                value={description}
                onChange={handleDescriptionChange} />
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description='The details used to identify your publication around the web'
            isEditing={isEditing}
            keywords={keywords}
            navid='general'
            saveState={saveState}
            testId='title-and-description'
            title='Title & description'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? inputFields : values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(TitleAndDescription, 'Title & description');
