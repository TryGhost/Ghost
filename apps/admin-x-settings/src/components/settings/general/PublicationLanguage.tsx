import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {SelectOption, SelectWithOther, SettingGroupContent, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

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

    const validateLocale = (value: string) => {
        const errorMessage = 'Invalid locale format. Examples: en, en-US, zh-Hant, sr-Latn, x-private';

        if (!value) {
            return 'Locale is required';
        }

        // Comprehensive BCP 47 validation pattern
        // Supports:
        // - 2-3 letter language codes (en, eng)
        // - 4-letter script codes (Latn, Cyrl)
        // - 2-letter region codes (US, GB)
        // - 3-digit region codes (419 for Latin America)
        // - Variants (valencia, 1996)
        // - Extensions (u-ca-buddhist)
        // - Private use (x-private)
        // - Grandfathered tags (i-klingon, zh-min-nan)
        const bcp47Pattern = /^(((en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((([a-z]{2,3}(-[a-z]{3}(-[a-z]{3}){0,2})?)|[a-z]{4}|[a-z]{5,8})(-[a-z]{4})?(-([a-z]{2}|[0-9]{3}))?(-([a-z0-9]{5,8}|[0-9][a-z0-9]{3}))*(-([0-9a-wy-z](-[a-z0-9]{2,8})+))*(-(x(-[a-z0-9]{1,8})+))?)|(x(-[a-z0-9]{1,8})+))$/i;

        if (!bcp47Pattern.test(value)) {
            return errorMessage;
        }

        return null;
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
