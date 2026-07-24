import { useState } from "react";
import { FacebookLogo, Field, FieldLabel, GoogleLogo, Switch, Tabs, TabsContent, TabsList, TabsTrigger, XLogo } from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { APIError } from "@tryghost/admin-x-framework/errors";
import { getImageUrl, useUploadImage } from "@tryghost/admin-x-framework/api/images";
import { getSettingValues } from "@tryghost/admin-x-framework/api/settings";

import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { ImageUpload } from "@/settings/app/shared/image-upload";
import { SettingGroup, SettingGroupContent } from "@/settings/app/shared/setting-group";
import { TextField } from "@/settings/app/shared/text-field";
import { useSettingsHandleError } from "@/settings/app/shared/toast";
import { usePinturaEditor } from "@/settings/app/shared/use-pintura-editor";
import { useSettingGroup } from "@/settings/app/shared/use-setting-group";

interface SearchEnginePreviewProps {
    title: string;
    description: string;
    icon?: string;
    url?: string;
}

function SearchEnginePreview({ title, description, icon, url }: SearchEnginePreviewProps) {
    const siteUrl = url?.replace(/\/$/, "");
    const siteDomain = siteUrl?.replace(/^https?:\/\//, "").replace(/\/?$/, "");

    return (
        <div>
            <div className="-mx-5 -mb-5 overflow-hidden rounded-b-xl bg-muted px-5 pt-2 md:-mx-7 md:-mb-7 md:px-7 md:pt-7">
                <div className="-mt-4 mb-2 text-sm text-muted-foreground uppercase">Preview</div>
                <div className="rounded-t-sm bg-surface-elevated px-5 py-3 shadow-lg">
                    <div className="mt-3 flex items-center">
                        <div>
                            <GoogleLogo className="mr-7 h-7" />
                        </div>
                        <div className="grow">
                            <div className="flex w-full items-center justify-end rounded-full bg-surface-elevated p-3 px-4 shadow">
                                <LucideIcon.Search className="size-4 stroke-2 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                        <div
                            className="flex size-7 items-center justify-center rounded-full bg-muted"
                            style={{
                                backgroundImage: icon ? `url(${icon})` : "none",
                                backgroundSize: "contain",
                            }}
                        >
                        </div>
                        <div className="flex flex-col">
                            <span>{siteDomain}</span>
                            <span className="-mt-0.5 inline-block text-sm text-muted-foreground">{siteUrl}</span>
                        </div>
                    </div>
                    <div className="mt-1 flex flex-col">
                        <span className="text-lg text-[#1a0dab]">{title}</span>
                        <span className="text-muted-foreground">{description}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SeoMeta({ keywords }: { keywords: string[] }) {
    const {
        localSettings,
        saveState,
        siteData,
        focusRef,
        isEditing,
        handleSave,
        handleCancel,
        handleEditingChange,
        updateSetting,
    } = useSettingGroup();

    const handleError = useSettingsHandleError();
    const { mutateAsync: uploadImage } = useUploadImage();
    const editor = usePinturaEditor();

    const createImageEditHandler = (settingKey: string, image: string) => () => editor.openEditor({
        image,
        handleSave: async (file: File) => {
            const imageUrl = getImageUrl(await uploadImage({ file }));
            updateSetting(settingKey, imageUrl);
        },
    });
    const hasLlmsTxt = useFeatureFlag("llmsTxt");

    const [
        metaTitle,
        metaDescription,
        siteTitle,
        siteDescription,
        facebookTitle,
        facebookDescription,
        facebookImage,
        twitterTitle,
        twitterDescription,
        twitterImage,
    ] = getSettingValues(localSettings, [
        "meta_title",
        "meta_description",
        "title",
        "description",
        "og_title",
        "og_description",
        "og_image",
        "twitter_title",
        "twitter_description",
        "twitter_image",
    ]).map((value) => value || "") as string[];

    const [llmsEnabledValue] = getSettingValues(localSettings, ["llms_enabled"]);
    const llmsEnabled = llmsEnabledValue !== false;

    const [selectedTab, setSelectedTab] = useState("metadata");

    const createSettingHandler = (settingKey: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting(settingKey, e.target.value);
        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const createImageUploadHandler = (settingKey: string) => async (file: File) => {
        try {
            const imageUrl = getImageUrl(await uploadImage({ file }));
            updateSetting(settingKey, imageUrl);
            if (!isEditing) {
                handleEditingChange(true);
            }
        } catch (e) {
            const error = e as APIError;
            if (error.response?.status === 415) {
                error.message = "Unsupported file type";
            }
            handleError(error);
        }
    };

    const createImageDeleteHandler = (settingKey: string) => () => {
        updateSetting(settingKey, "");
        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const handleLlmsToggleChange = (checked: boolean) => {
        updateSetting("llms_enabled", checked);
        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const metadataTabContent = (
        <>
            <SettingGroupContent className="my-6 gap-3">
                {hasLlmsTxt && (
                    <Field orientation="horizontal">
                        <FieldLabel htmlFor="llms-enabled">Enable structured data for LLMs and AI search engines</FieldLabel>
                        <Switch checked={llmsEnabled} id="llms-enabled" onCheckedChange={handleLlmsToggleChange} />
                    </Field>
                )}
                <TextField
                    hint="Recommended: 70 characters"
                    inputRef={focusRef}
                    maxLength={300}
                    placeholder={siteTitle}
                    title="Meta title"
                    value={metaTitle}
                    onChange={createSettingHandler("meta_title")}
                />
                <TextField
                    hint="Recommended: 156 characters"
                    maxLength={500}
                    placeholder={siteDescription}
                    title="Meta description"
                    value={metaDescription}
                    onChange={createSettingHandler("meta_description")}
                />
            </SettingGroupContent>
            <SearchEnginePreview
                description={metaDescription || siteDescription}
                icon={siteData?.icon}
                title={metaTitle || siteTitle}
                url={siteData?.url}
            />
        </>
    );

    const facebookTabContent = (
        <div className="mt-6 md:mx-[52px]">
            <div className="mb-4 flex items-center gap-2">
                <div>
                    <FacebookLogo className="size-10" />
                </div>
                <div>
                    <div className="mb-1 leading-none font-semibold text-foreground">{siteTitle}</div>
                    <div className="leading-none text-muted-foreground">2h</div>
                </div>
            </div>
            <div>
                <div className="mb-2 h-3 w-full rounded bg-muted"></div>
                <div className="mb-4 h-3 w-3/5 rounded bg-muted"></div>
                <SettingGroupContent className="overflow-hidden rounded-md border border-border">
                    <ImageUpload
                        containerClassName="h-[300px]"
                        fileUploadClassName="rounded-b-none border-b-0"
                        id="facebook-image"
                        imageClassName="size-full object-cover"
                        imageURL={facebookImage}
                        onDelete={createImageDeleteHandler("og_image")}
                        onEdit={editor.isEnabled ? createImageEditHandler("og_image", facebookImage) : undefined}
                        editButtonAriaLabel="Edit Facebook image"
                        onUpload={createImageUploadHandler("og_image")}
                    >
                        Upload Facebook image
                    </ImageUpload>
                    <div className="mt-5 flex flex-col gap-x-6 gap-y-7 px-4 pb-7">
                        <TextField
                            maxLength={300}
                            placeholder={siteTitle}
                            title="Facebook title"
                            value={facebookTitle}
                            onChange={createSettingHandler("og_title")}
                        />
                        <TextField
                            maxLength={300}
                            placeholder={siteDescription}
                            title="Facebook description"
                            value={facebookDescription}
                            onChange={createSettingHandler("og_description")}
                        />
                    </div>
                </SettingGroupContent>
            </div>
        </div>
    );

    const twitterTabContent = (
        <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <div className="pt-1">
                <XLogo className="-mb-1 size-10" />
            </div>
            <div className="w-full md:mr-[52px]">
                <div className="mb-2">
                    <span className="mr-1 font-semibold text-foreground">{siteTitle}</span>
                    <span className="text-muted-foreground">&#183; 2h</span>
                </div>
                <div className="mb-2 h-3 w-full rounded bg-muted"></div>
                <div className="mb-4 h-3 w-3/5 rounded bg-muted"></div>
                <SettingGroupContent className="overflow-hidden rounded-md border border-border">
                    <ImageUpload
                        containerClassName="h-[300px]"
                        fileUploadClassName="rounded-b-none border-b-0"
                        id="twitter-image"
                        imageClassName="size-full object-cover"
                        imageURL={twitterImage}
                        onDelete={createImageDeleteHandler("twitter_image")}
                        onEdit={editor.isEnabled ? createImageEditHandler("twitter_image", twitterImage) : undefined}
                        editButtonAriaLabel="Edit X image"
                        onUpload={createImageUploadHandler("twitter_image")}
                    >
                        Upload X image
                    </ImageUpload>
                    <div className="mt-6 flex flex-col gap-x-6 gap-y-7 px-4 pb-7">
                        <TextField
                            maxLength={300}
                            placeholder={siteTitle}
                            title="X title"
                            value={twitterTitle}
                            onChange={createSettingHandler("twitter_title")}
                        />
                        <TextField
                            maxLength={300}
                            placeholder={siteDescription}
                            title="X description"
                            value={twitterDescription}
                            onChange={createSettingHandler("twitter_description")}
                        />
                    </div>
                </SettingGroupContent>
            </div>
        </div>
    );

    return (
        <SettingGroup
            description="Extra content for search engines and social accounts"
            isEditing={isEditing}
            keywords={keywords}
            navid="metadata"
            saveState={saveState}
            testId="seometa"
            title="Meta data"
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <Tabs data-testid="seo-tabview" value={selectedTab} variant="underline" onValueChange={setSelectedTab}>
                <TabsList>
                    <TabsTrigger value="metadata">Search</TabsTrigger>
                    <TabsTrigger value="twitter">X card</TabsTrigger>
                    <TabsTrigger value="facebook">Facebook card</TabsTrigger>
                </TabsList>
                <TabsContent value="metadata">{metadataTabContent}</TabsContent>
                <TabsContent value="twitter">{twitterTabContent}</TabsContent>
                <TabsContent value="facebook">{facebookTabContent}</TabsContent>
            </Tabs>
        </SettingGroup>
    );
}
