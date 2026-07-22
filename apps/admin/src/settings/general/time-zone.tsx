import { useEffect, useState } from "react";
import { Combobox, ComboboxContent, ComboboxTrigger, ComboboxValue, Field, FieldDescription, FieldLabel, MultiSelectCombobox } from "@tryghost/shade/components";
import { getSettingValues } from "@tryghost/admin-x-framework/api/settings";
import { timezoneDataWithGMTOffset } from "@tryghost/timezone-data";

import { SettingGroup, SettingGroupContent } from "@/settings/app/shared/setting-group";
import { useSettingGroup } from "@/settings/app/shared/use-setting-group";

function getLocalTime(timeZone: string): string {
    const userLocale = navigator.language.startsWith("en") ? navigator.language : "en-US";
    return new Date().toLocaleString(userLocale, { timeZone });
}

function Hint({ timezone }: { timezone: string }) {
    const [currentTime, setCurrentTime] = useState(getLocalTime(timezone));

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(getLocalTime(timezone));
        }, 1000);
        return () => {
            clearInterval(timer);
        };
    }, [timezone]);

    return <>The local time here is currently {currentTime}</>;
}

export function TimeZone({ keywords }: { keywords: string[] }) {
    const [timezoneOpen, setTimezoneOpen] = useState(false);
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange,
    } = useSettingGroup();

    const [publicationTimezone] = getSettingValues(localSettings, ["timezone"]) as string[];

    const timezoneOptions = timezoneDataWithGMTOffset().map((tzOption) => ({
        value: tzOption.name,
        label: tzOption.label,
    }));
    const selectedTimezone = timezoneOptions.find((option) => option.value === publicationTimezone);

    const handleTimezoneChange = (value?: string) => {
        updateSetting("timezone", value || null);
        handleEditingChange(true);
    };

    return (
        <SettingGroup
            description="Set the time and date of your publication, used for all published posts"
            isEditing={isEditing}
            keywords={keywords}
            navid="timezone"
            saveState={saveState}
            testId="timezone"
            title="Site timezone"
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <SettingGroupContent columns={1}>
                <Field>
                    <FieldLabel>Site timezone</FieldLabel>
                    <Combobox open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                        <ComboboxTrigger aria-label="Site timezone" data-testid="timezone-select"><ComboboxValue>{selectedTimezone?.label}</ComboboxValue></ComboboxTrigger>
                        <ComboboxContent>
                            <MultiSelectCombobox
                                i18n={{ searchPlaceholder: "Search timezones..." }}
                                isMultiSelect={false}
                                options={timezoneOptions}
                                values={publicationTimezone ? [publicationTimezone] : []}
                                autoCloseOnSelect
                                onChange={(values) => {
                                    if (values[0]) {
                                        handleTimezoneChange(values[0]);
                                    }
                                }}
                                onClose={() => setTimezoneOpen(false)}
                            />
                        </ComboboxContent>
                    </Combobox>
                    <FieldDescription><Hint timezone={publicationTimezone} /></FieldDescription>
                </Field>
            </SettingGroupContent>
        </SettingGroup>
    );
}
