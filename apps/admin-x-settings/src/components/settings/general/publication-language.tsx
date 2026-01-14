import LOCALE_DATA from '@tryghost/i18n/lib/locale-data.json';
import React from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {SelectWithOther, SettingGroupContent, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {validateLocale} from '../../../utils/locale-validation';
import type {SelectOption} from '@tryghost/admin-x-design-system';

const PublicationLanguage: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        errors,
        handleEditingChange
    } = useSettingGroup({
        onValidate: () => {
            const localeError = validateLocale(publicationLanguage);
            if (localeError) {
                return {
                    publicationLanguage: localeError
                };
            }

            return {};
        }
    });

    const [publicationLanguage] = getSettingValues(localSettings, ['locale']) as string[];

    const localeOptions = React.useMemo(() => {
        const options: SelectOption[] = LOCALE_DATA.map(locale => ({
            value: locale.code,
            label: `${locale.label} (${locale.code})`
        }));

        return options;
    }, []);

    const handleLanguageChange = (value: string) => {
        updateSetting('locale', value);
        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const hint = (
        <>
            Default: English (<strong>en</strong>); find out more about
            <a className='text-green-400' href="https://ghost.org/docs/faq/translation/" rel="noopener noreferrer" target="_blank"> using Ghost in other languages</a>
        </>
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
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <SettingGroupContent columns={1}>
                <SelectWithOther
                    defaultListValue="en"
                    error={!!errors.publicationLanguage}
                    hint={errors.publicationLanguage || hint}
                    options={localeOptions}
                    otherHint="Enter a custom locale code."
                    otherPlaceholder="e.g. pt-BR, sr-Cyrl, en"
                    selectedValue={publicationLanguage}
                    testId="locale-select"
                    title="Site language"
                    validate={validateLocale}
                    isSearchable
                    onSelect={handleLanguageChange}
                />
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(PublicationLanguage, 'Publication language');
