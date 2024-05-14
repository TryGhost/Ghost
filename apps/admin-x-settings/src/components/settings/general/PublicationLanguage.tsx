import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

const PublicationLanguage: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        focusRef,
        errors,
        clearError,
        handleEditingChange
    } = useSettingGroup({
        onValidate: () => {
            if (!publicationLanguage) {
                return {
                    publicationLanguage: 'Enter a value'
                };
            }

            return {};
        }
    });

    const [publicationLanguage] = getSettingValues(localSettings, ['locale']) as string[];

    const handleLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('locale', e.target.value);
    };

    const values = (
        <SettingGroupContent values={[
            {
                heading: 'Site language',
                key: 'site-language',
                value: publicationLanguage
            }
        ]} />
    );

    const hint = (
        <>
            Default: English (<strong>en</strong>); find out more about
            <a className='text-green-400' href="https://ghost.org/docs/faq/translation/" rel="noopener noreferrer" target="_blank"> using Ghost in other languages</a>
        </>
    );

    const inputFields = (
        <SettingGroupContent columns={1}>
            <TextField
                error={!!errors.publicationLanguage}
                hint={errors.publicationLanguage || hint}
                inputRef={focusRef}
                placeholder="Site language"
                title='Site language'
                value={publicationLanguage}
                onChange={handleLanguageChange}
                onKeyDown={() => clearError('password')}
            />
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description="Set the language/locale which is used on your site"
            isEditing={isEditing}
            keywords={keywords}
            navid='publication-language'
            saveState={saveState}
            testId='publication-language'
            title="Publication Language"
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? inputFields : values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(PublicationLanguage, 'Publication language');
