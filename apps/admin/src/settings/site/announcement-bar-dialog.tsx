import { useRef, useState } from "react";
import {
    Checkbox,
    Field,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    Tabs,
    TabsList,
    TabsTrigger,
} from "@tryghost/shade/components";
import { getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { getHomepageUrl } from "@tryghost/admin-x-framework/api/site";
import { useBrowsePosts } from "@tryghost/admin-x-framework/api/posts";
import { useNavigate } from "@tryghost/admin-x-framework";

import { AnnouncementContentEditor } from "./announcement-content-editor";
import { ColorSwatches } from "./color-picker-field";
import { type PreviewDevice, PreviewDialog } from "./preview-chrome";
import { SitePreviewFrame } from "./site-preview-frame";
import { showToast } from "@/settings/app/shared/toast";
import { useSettingGroup } from "@/settings/app/shared/use-setting-group";

/**
 * The routed announcement bar dialog (`/settings/announcement-bar/edit`),
 * ported from the legacy announcement-bar-modal.tsx: Koenig content editor,
 * background swatches and audience visibility on the sidebar, live preview
 * with the announcement_* x-ghost-preview params.
 */

function getPreviewData(announcementBackgroundColor?: string, announcementContent?: string, visibility?: string[]): string {
    const params = new URLSearchParams();
    params.append("announcement_bg", announcementBackgroundColor || "accent");
    params.append("announcement", announcementContent || "");
    if (visibility && visibility.length > 0) {
        params.append("announcement_vis", visibility.join(","));
    }
    return params.toString();
}

function AnnouncementBarDialogContent() {
    const navigate = useNavigate();
    const { localSettings, updateSetting, handleSave, okProps, siteData } = useSettingGroup({ savingDelay: 500 });
    const [announcementContent] = getSettingValues<string>(localSettings, ["announcement_content"]);
    const [accentColor] = getSettingValues<string>(localSettings, ["accent_color"]);
    const [announcementBackgroundColor] = getSettingValues<string>(localSettings, ["announcement_background"]);
    const [announcementVisibility] = getSettingValues<string[]>(localSettings, ["announcement_visibility"]);
    const [paidMembersEnabled] = getSettingValues<boolean>(localSettings, ["paid_members_enabled"]);
    const visibilitySettings = JSON.parse(announcementVisibility?.toString() || "[]") as string[];
    const [selectedPreviewTab, setSelectedPreviewTab] = useState("homepage");
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");

    const toggleVisibility = (visibility: string, value: boolean) => {
        const index = visibilitySettings.indexOf(visibility);
        if (index === -1 && value) {
            visibilitySettings.push(visibility);
        } else {
            visibilitySettings.splice(index, 1);
        }
        updateSetting("announcement_visibility", JSON.stringify(visibilitySettings));
    };

    const contentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const updateContentDebounced = (value: string) => {
        if (contentTimerRef.current) {
            clearTimeout(contentTimerRef.current);
        }
        contentTimerRef.current = setTimeout(() => updateSetting("announcement_content", value), 500);
    };

    const { data: { posts: [latestPost] } = { posts: [] } } = useBrowsePosts({
        searchParams: {
            filter: "status:published",
            order: "published_at DESC",
            limit: "1",
            fields: "id,url",
        },
    });

    let selectedTabURL = siteData ? getHomepageUrl(siteData) : "";
    if (selectedPreviewTab === "post" && latestPost?.url) {
        selectedTabURL = latestPost.url;
    }

    const visibilityCheckboxes = [
        { label: "Public visitors", value: "visitors" },
        { label: "Free members", value: "free_members" },
        ...(paidMembersEnabled ? [{ label: "Paid members", value: "paid_members" }] : []),
    ];

    const sidebar = (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Announcement</span>
                <AnnouncementContentEditor
                    placeholder="Highlight breaking news, offers or updates"
                    value={announcementContent}
                    onChange={updateContentDebounced}
                />
            </div>
            <div className="flex flex-col gap-3">
                <span className="text-sm font-medium">Background color</span>
                <ColorSwatches
                    size="lg"
                    swatches={[
                        { hex: "#08090c", title: "Dark", value: "dark" },
                        { hex: "#ffffff", title: "Light", value: "light" },
                        { hex: accentColor || "#ffdd00", title: "Accent", value: "accent" },
                    ]}
                    value={announcementBackgroundColor}
                    onSelect={(value) => {
                        if (value !== null) {
                            updateSetting("announcement_background", value);
                        }
                    }}
                />
            </div>
            <FieldSet>
                <FieldLegend variant="label">Visibility</FieldLegend>
                <FieldGroup data-slot="checkbox-group">
                    {visibilityCheckboxes.map((checkbox) => (
                        <Field key={checkbox.value} orientation="horizontal">
                            <Checkbox
                                checked={visibilitySettings.includes(checkbox.value)}
                                id={`announcement-${checkbox.value}`}
                                onCheckedChange={(checked) => toggleVisibility(checkbox.value, checked === true)}
                            />
                            <FieldLabel htmlFor={`announcement-${checkbox.value}`}>{checkbox.label}</FieldLabel>
                        </Field>
                    ))}
                </FieldGroup>
            </FieldSet>
        </div>
    );

    return (
        <PreviewDialog
            buttonsDisabled={okProps.disabled}
            device={previewDevice}
            okLabel={okProps.label || "Save"}
            preview={(
                <SitePreviewFrame
                    previewData={getPreviewData(announcementBackgroundColor, announcementContent, visibilitySettings)}
                    testId="announcement-bar-preview-iframe"
                    url={selectedTabURL}
                    addDelay
                />
            )}
            previewBgClassName="bg-gradient-to-tr from-background to-muted"
            previewToolbarTabs={latestPost ? (
                <Tabs value={selectedPreviewTab} variant="button-sm" onValueChange={(id) => setSelectedPreviewTab(id)}>
                    <TabsList>
                        <TabsTrigger value="homepage">Homepage</TabsTrigger>
                        <TabsTrigger value="post">Post</TabsTrigger>
                    </TabsList>
                </Tabs>
            ) : undefined}
            sidebar={sidebar}
            testId="announcement-bar-modal"
            title="Announcement"
            // The legacy modal closes without a dirty confirmation.
            onClose={() => navigate("/settings/announcement-bar")}
            onDeviceChange={setPreviewDevice}
            onOk={() => {
                void handleSave({ fakeWhenUnchanged: true }).then((success) => {
                    if (!success) {
                        showToast({
                            type: "error",
                            message: "An error occurred while saving your changes. Please try again.",
                        });
                    }
                }).catch(() => {
                    // save errors already surface through the group's error handler
                });
            }}
        />
    );
}

export function AnnouncementBarDialog() {
    const { data: settingsData } = useBrowseSettings();

    if (!settingsData) {
        return null;
    }

    return <AnnouncementBarDialogContent />;
}
