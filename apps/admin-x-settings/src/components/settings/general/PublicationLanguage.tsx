import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {SelectOption, SelectWithOther, SettingGroupContent, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {validateLocale} from '../../../utils/localeValidation';

const LOCALE_DATA = [
    {code: 'af', label: 'Afrikaans'},
    {code: 'ar', label: 'Arabic'},
    {code: 'bg', label: 'Bulgarian'},
    {code: 'bn', label: 'Bengali'},
    {code: 'bs', label: 'Bosnian'},
    {code: 'ca', label: 'Catalan'},
    {code: 'cs', label: 'Czech'},
    {code: 'da', label: 'Danish'},
    {code: 'de', label: 'German'},
    {code: 'de-CH', label: 'Swiss German'},
    {code: 'el', label: 'Greek'},
    {code: 'en', label: 'English'},
    {code: 'eo', label: 'Esperanto'},
    {code: 'es', label: 'Spanish'},
    {code: 'et', label: 'Estonian'},
    {code: 'fa', label: 'Persian/Farsi'},
    {code: 'fi', label: 'Finnish'},
    {code: 'fr', label: 'French'},
    {code: 'gd', label: 'Gaelic (Scottish)'},
    {code: 'he', label: 'Hebrew'},
    {code: 'hi', label: 'Hindi'},
    {code: 'hr', label: 'Croatian'},
    {code: 'hu', label: 'Hungarian'},
    {code: 'id', label: 'Indonesian'},
    {code: 'is', label: 'Icelandic'},
    {code: 'it', label: 'Italian'},
    {code: 'ja', label: 'Japanese'},
    {code: 'ko', label: 'Korean'},
    {code: 'kz', label: 'Kazakh'},
    {code: 'lt', label: 'Lithuanian'},
    {code: 'lv', label: 'Latvian'},
    {code: 'mk', label: 'Macedonian'},
    {code: 'mn', label: 'Mongolian'},
    {code: 'ms', label: 'Malay'},
    {code: 'nb', label: 'Norwegian Bokmål'},
    {code: 'ne', label: 'Nepali'},
    {code: 'nl', label: 'Dutch'},
    {code: 'nn', label: 'Norwegian Nynorsk'},
    {code: 'pa', label: 'Punjabi'},
    {code: 'pl', label: 'Polish'},
    {code: 'pt', label: 'Portuguese'},
    {code: 'pt-BR', label: 'Portuguese (Brazil)'},
    {code: 'ro', label: 'Romanian'},
    {code: 'ru', label: 'Russian'},
    {code: 'si', label: 'Sinhala'},
    {code: 'sk', label: 'Slovak'},
    {code: 'sl', label: 'Slovenian'},
    {code: 'sq', label: 'Albanian'},
    {code: 'sr', label: 'Serbian'},
    {code: 'sr-Cyrl', label: 'Serbian (Cyrillic)'},
    {code: 'sv', label: 'Swedish'},
    {code: 'sw', label: 'Swahili'},
    {code: 'ta', label: 'Tamil'},
    {code: 'th', label: 'Thai'},
    {code: 'tr', label: 'Turkish'},
    {code: 'uk', label: 'Ukrainian'},
    {code: 'ur', label: 'Urdu'},
    {code: 'uz', label: 'Uzbek'},
    {code: 'vi', label: 'Vietnamese'},
    {code: 'zh', label: 'Chinese'},
    {code: 'zh-Hant', label: 'Traditional Chinese'}
];

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
            if (!publicationLanguage) {
                return {
                    publicationLanguage: 'Enter a value'
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
                    otherPlaceholder="e.g. en-GB, fr-CA"
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
