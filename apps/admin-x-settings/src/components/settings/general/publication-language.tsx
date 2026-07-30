import LOCALE_DATA from '@tryghost/i18n/lib/locale-data.json';
import React from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Button, Combobox, ComboboxContent, ComboboxTrigger, ComboboxValue, Field, FieldDescription, FieldError, FieldLabel, Input, MultiSelectCombobox} from '@tryghost/shade/components';
import {SettingGroupContent} from '@tryghost/shade/patterns';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {validateLocale} from '../../../utils/locale-validation';
import {withErrorBoundary} from '../../error-boundary';

const PublicationLanguage: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const languageErrorId = React.useId();
    const [languageOpen, setLanguageOpen] = React.useState(false);
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
        const options = LOCALE_DATA.map(locale => ({
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

    const isCustomValue = Boolean(publicationLanguage && !localeOptions.some(option => option.value === publicationLanguage));
    const [isOtherSelected, setIsOtherSelected] = React.useState(isCustomValue);
    const [validationError, setValidationError] = React.useState<string | null>(null);
    const localeOptionsWithOther = React.useMemo(() => [...localeOptions, {label: 'Other...', value: 'other'}], [localeOptions]);
    const selectedLocale = localeOptionsWithOther.find(option => option.value === publicationLanguage);

    React.useEffect(() => {
        if (publicationLanguage && localeOptions.some(option => option.value === publicationLanguage)) {
            setIsOtherSelected(false);
            setValidationError(null);
        }
    }, [localeOptions, publicationLanguage]);

    const handleCustomLanguageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setValidationError(validateLocale(value) || (!value ? 'Enter a value' : null));
        handleLanguageChange(value);
    };

    const hint = (
        <>
            Default: English (<strong>en</strong>); find out more about
            <a className='text-primary' href="https://ghost.org/docs/faq/translation/" rel="noopener noreferrer" target="_blank"> using Ghost in other languages</a>
        </>
    );

    const languageField = isOtherSelected || isCustomValue ? (
        <>
            <Field data-invalid={Boolean(errors.publicationLanguage || validationError) || undefined}>
                <FieldLabel htmlFor='custom-locale'>Site language</FieldLabel>
                <Input
                    aria-invalid={Boolean(errors.publicationLanguage || validationError) || undefined}
                    className='border-transparent bg-muted'
                    data-testid='locale-select'
                    id='custom-locale'
                    placeholder='e.g. pt-BR, sr-Cyrl, en'
                    value={publicationLanguage}
                    onChange={handleCustomLanguageChange}
                />
                {validationError || errors.publicationLanguage ? <FieldError>{validationError || errors.publicationLanguage}</FieldError> : <FieldDescription>Enter a custom locale code.</FieldDescription>}
            </Field>
            <Button
                className='h-auto self-start px-0'
                size='sm'
                type='button'
                variant='link'
                onClick={() => {
                    setIsOtherSelected(false);
                    setValidationError(null);
                    handleLanguageChange('en');
                }}
            >
                Choose from list
            </Button>
        </>
    ) : (
        <Field data-invalid={Boolean(errors.publicationLanguage) || undefined}>
            <FieldLabel>Site language</FieldLabel>
            <Combobox open={languageOpen} onOpenChange={setLanguageOpen}>
                <ComboboxTrigger
                    aria-describedby={errors.publicationLanguage ? languageErrorId : undefined}
                    aria-invalid={Boolean(errors.publicationLanguage) || undefined}
                    aria-label='Site language'
                    data-testid='locale-select'
                >
                    <ComboboxValue>{selectedLocale?.label}</ComboboxValue>
                </ComboboxTrigger>
                <ComboboxContent>
                    <MultiSelectCombobox
                        i18n={{searchPlaceholder: 'Search languages...'}}
                        isMultiSelect={false}
                        options={localeOptionsWithOther}
                        values={publicationLanguage ? [publicationLanguage] : []}
                        autoCloseOnSelect
                        onChange={(values) => {
                            if (values[0] === 'other') {
                                setIsOtherSelected(true);
                                handleLanguageChange('');
                            } else if (values[0]) {
                                handleLanguageChange(values[0]);
                            }
                        }}
                        onClose={() => setLanguageOpen(false)}
                    />
                </ComboboxContent>
            </Combobox>
            {errors.publicationLanguage ? <FieldError id={languageErrorId}>{errors.publicationLanguage}</FieldError> : <FieldDescription>{hint}</FieldDescription>}
        </Field>
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
            onCancel={() => {
                setValidationError(null);
                handleCancel();
            }}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <SettingGroupContent columns={1}>
                {languageField}
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(PublicationLanguage, 'Publication language');
