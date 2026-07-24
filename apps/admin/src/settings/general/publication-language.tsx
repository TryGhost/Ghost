import LOCALE_DATA from "@tryghost/i18n/lib/locale-data.json";
import { useEffect, useId, useMemo, useState } from "react";
import { Button, Combobox, ComboboxContent, ComboboxTrigger, ComboboxValue, Field, FieldDescription, FieldError, FieldLabel, MultiSelectCombobox } from "@tryghost/shade/components";
import { getSettingValues } from "@tryghost/admin-x-framework/api/settings";
import { validateLocale } from "@tryghost/admin-x-settings/src/utils/locale-validation";

import { SettingGroup, SettingGroupContent } from "@/settings/app/shared/setting-group";
import { TextField } from "@/settings/app/shared/text-field";
import { useSettingGroup } from "@/settings/app/shared/use-setting-group";

export function PublicationLanguage({ keywords }: { keywords: string[] }) {
    const languageErrorId = useId();
    const [languageOpen, setLanguageOpen] = useState(false);
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        errors,
        handleEditingChange,
    } = useSettingGroup({
        onValidate: () => {
            const localeError = validateLocale(publicationLanguage);
            if (localeError) {
                return { publicationLanguage: localeError };
            }
            return {};
        },
    });

    const [publicationLanguage] = getSettingValues(localSettings, ["locale"]) as string[];

    const localeOptions = useMemo(() => LOCALE_DATA.map((locale) => ({
        value: locale.code,
        label: `${locale.label} (${locale.code})`,
    })), []);

    const handleLanguageChange = (value: string) => {
        updateSetting("locale", value);
        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const isCustomValue = Boolean(publicationLanguage && !localeOptions.some((option) => option.value === publicationLanguage));
    const [isOtherSelected, setIsOtherSelected] = useState(isCustomValue);
    const [validationError, setValidationError] = useState<string | null>(null);
    const localeOptionsWithOther = useMemo(() => [...localeOptions, { label: "Other...", value: "other" }], [localeOptions]);
    const selectedLocale = localeOptionsWithOther.find((option) => option.value === publicationLanguage);

    useEffect(() => {
        if (publicationLanguage && localeOptions.some((option) => option.value === publicationLanguage)) {
            setIsOtherSelected(false);
            setValidationError(null);
        }
    }, [localeOptions, publicationLanguage]);

    const handleCustomLanguageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setValidationError(validateLocale(value) || (!value ? "Enter a value" : null));
        handleLanguageChange(value);
    };

    const hint = (
        <>
            Default: English (<strong>en</strong>); find out more about
            <a className="text-primary" href="https://ghost.org/docs/faq/translation/" rel="noopener noreferrer" target="_blank"> using Ghost in other languages</a>
        </>
    );

    const languageField = isOtherSelected || isCustomValue ? (
        <>
            <TextField
                error={Boolean(errors.publicationLanguage || validationError)}
                hint={validationError || errors.publicationLanguage || "Enter a custom locale code."}
                placeholder="e.g. pt-BR, sr-Cyrl, en"
                testId="locale-select"
                title="Site language"
                value={publicationLanguage}
                onChange={handleCustomLanguageChange}
            />
            <Button
                className="h-auto self-start px-0"
                size="sm"
                type="button"
                variant="link"
                onClick={() => {
                    setIsOtherSelected(false);
                    setValidationError(null);
                    handleLanguageChange("en");
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
                    aria-label="Site language"
                    data-testid="locale-select"
                >
                    <ComboboxValue>{selectedLocale?.label}</ComboboxValue>
                </ComboboxTrigger>
                <ComboboxContent>
                    <MultiSelectCombobox
                        i18n={{ searchPlaceholder: "Search languages..." }}
                        isMultiSelect={false}
                        options={localeOptionsWithOther}
                        values={publicationLanguage ? [publicationLanguage] : []}
                        autoCloseOnSelect
                        onChange={(values) => {
                            if (values[0] === "other") {
                                setIsOtherSelected(true);
                                handleLanguageChange("");
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
        <SettingGroup
            description="Set the language/locale which is used on your site"
            isEditing={isEditing}
            keywords={keywords}
            navid="publication-language"
            saveState={saveState}
            testId="publication-language"
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
        </SettingGroup>
    );
}
