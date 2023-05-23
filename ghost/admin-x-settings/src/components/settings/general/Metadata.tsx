import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/TextField';
import useSettingGroup from '../../../hooks/useSettingGroup';

const Metadata: React.FC = () => {
    const {
        currentState,
        focusRef,
        handleSave,
        handleCancel,
        updateSetting,
        getSettingValues,
        handleStateChange
    } = useSettingGroup();

    const [metaTitle, metaDescription] = getSettingValues(['meta_title', 'meta_description']) as string[];

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('meta_title', e.target.value);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('meta_description', e.target.value);
    };

    const values = (
        <div>
            [TBD: search engine preview in view mode]
        </div>
    );

    const inputFields = (
        <SettingGroupContent>
            <TextField
                hint="Recommended: 70 characters"
                inputRef={focusRef}
                placeholder="[TBD: site title]"
                title="Meta title"
                value={metaTitle}
                onChange={handleTitleChange}
            />
            <TextField
                hint="Recommended: 156 characters"
                placeholder="[TBD: site description]"
                title="Meta description"
                value={metaDescription}
                onChange={handleDescriptionChange}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description='Extra content for search engines'
            navid='metadata'
            state={currentState}
            title='Metadata'
            onCancel={handleCancel}
            onSave={handleSave}
            onStateChange={handleStateChange}
        >
            {values}
            {currentState !== 'view' ? inputFields : ''}
        </SettingGroup>
    );
};

export default Metadata;