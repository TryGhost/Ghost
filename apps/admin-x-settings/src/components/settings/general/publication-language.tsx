import LOCALE_DATA from '@tryghost/i18n/lib/locale-data.json';
import React from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Button, Field, FieldDescription, FieldError, FieldLabel, MultiSelectCombobox, Popover, PopoverContent, PopoverTrigger, inputSurface} from '@tryghost/shade/components';
import {ChevronDown} from 'lucide-react';
import {SettingGroupContent, TextField} from '@tryghost/admin-x-design-system';
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
            <TextField
                data-testid="locale-select"
                error={Boolean(errors.publicationLanguage || validationError)}
                hint={validationError || errors.publicationLanguage || 'Enter a custom locale code.'}
                placeholder="e.g. pt-BR, sr-Cyrl, en"
                title="Site language"
                value={publicationLanguage}
                onChange={handleCustomLanguageChange}
            />
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
            <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
                <PopoverTrigger asChild>
                    <button
                        aria-describedby={errors.publicationLanguage ? languageErrorId : undefined}
                        aria-invalid={Boolean(errors.publicationLanguage) || undefined}
                        aria-label='Site language'
                        className={`${inputSurface('self')} flex h-(--control-height) w-full items-center justify-between px-3 text-control`}
                        data-testid='locale-select'
                        role='combobox'
                        type='button'
                    >
                        <span className='truncate'>{selectedLocale?.label}</span>
                        <ChevronDown className='ml-2 size-4 shrink-0 opacity-50' />
                    </button>
                </PopoverTrigger>
                <PopoverContent align='start' className='z-[9999] w-(--radix-popover-trigger-width) p-0'>
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
                </PopoverContent>
            </Popover>
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
            onCancel={handleCancel}
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
