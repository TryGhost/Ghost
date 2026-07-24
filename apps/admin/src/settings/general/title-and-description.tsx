import { getSettingValues } from "@tryghost/admin-x-framework/api/settings";

import { SettingGroup, SettingGroupContent } from "@/settings/app/shared/setting-group";
import { TextField } from "@/settings/app/shared/text-field";
import { useSettingGroup } from "@/settings/app/shared/use-setting-group";

export function TitleAndDescription({ keywords }: { keywords: string[] }) {
    const {
        errors,
        localSettings,
        isEditing,
        saveState,
        focusRef,
        clearError,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange,
    } = useSettingGroup({
        onValidate: () => {
            if (!title) {
                return { title: "Please enter a site title." };
            }
            if (title.length < 4) {
                return { title: "Please use a site title longer than 3 characters." };
            }
            if (title.length > 63) {
                return { title: "Please use a site title shorter than 63 characters." };
            }
            return {};
        },
    });

    const [title, description] = getSettingValues(localSettings, ["title", "description"]) as string[];

    return (
        <SettingGroup
            description="The details used to identify your publication around the web"
            isEditing={isEditing}
            keywords={keywords}
            navid="general"
            saveState={saveState}
            testId="title-and-description"
            title="Title & description"
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? (
                <SettingGroupContent>
                    <TextField
                        error={Boolean(errors.title)}
                        hint={errors.title || "The name of your site"}
                        inputRef={focusRef}
                        maxLength={63}
                        placeholder="Site title"
                        title="Site title"
                        value={title}
                        onChange={(e) => updateSetting("title", e.target.value)}
                        onKeyDown={() => clearError("title")}
                    />
                    <TextField
                        hint="A short description, used in your theme, meta data and search results"
                        maxLength={200}
                        placeholder="Site description"
                        title="Site description"
                        value={description}
                        onChange={(e) => updateSetting("description", e.target.value)}
                    />
                </SettingGroupContent>
            ) : (
                <SettingGroupContent
                    columns={2}
                    values={[
                        { heading: "Site title", key: "site-title", value: title },
                        { heading: "Site description", key: "site-description", value: description },
                    ]}
                />
            )}
        </SettingGroup>
    );
}
