import validator from "validator";
import { useCallback, useEffect, useState } from "react";
import {
    Button,
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    Switch,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Textarea,
    ToggleGroup,
    ToggleGroupItem,
} from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { type ErrorMessages, useForm } from "@tryghost/admin-x-framework/hooks";
import { type Newsletter, useBrowseNewsletters, useEditNewsletter } from "@tryghost/admin-x-framework/api/newsletters";
import { getImageUrl, useUploadImage } from "@tryghost/admin-x-framework/api/images";
import { getSettingValue, getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { hasSendingDomain, isManagedEmail, sendingDomain } from "@tryghost/admin-x-framework/api/config";
import { textColorForBackgroundColor } from "@tryghost/color-utils";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useNavigate, useParams } from "@tryghost/admin-x-framework";

import { NewsletterPreview } from "./newsletter-preview";
import { renderReplyToEmail, renderSenderEmail } from "@/automations/utils/newsletter-emails";
import { AnnouncementContentEditor } from "@/settings/site/announcement-content-editor";
import { ColorPickerField } from "@/settings/site/color-picker-field";
import { type PreviewDevice, PreviewDialog } from "@/settings/site/preview-chrome";
import { ImageUpload } from "@/settings/app/shared/image-upload";
import { TextField } from "@/settings/app/shared/text-field";
import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";
import { HostLimitError, useLimiter } from "@/settings/app/shared/use-limiter";

/**
 * The routed newsletter detail dialog (`/settings/newsletters/:newsletterId`),
 * ported from the legacy newsletter-detail-modal.tsx onto the shared
 * PreviewDialog chrome: General/Content/Design sidebar tabs beside the live
 * email preview, with the sender/reply-to validation + verification flows
 * and the archive/reactivate flow.
 */

type FontOption = { value: string; label: string; className?: string };

const FONT_OPTIONS: FontOption[] = [
    { value: "serif", label: "Elegant serif", className: "font-serif" },
    { value: "sans_serif", label: "Clean sans-serif" },
];

const FONT_WEIGHT_OPTIONS: Record<string, { options: FontOption[]; map?: Record<string, string> }> = {
    sans_serif: {
        options: [
            { value: "normal", label: "Regular", className: "font-normal" },
            { value: "medium", label: "Medium", className: "font-medium" },
            { value: "semibold", label: "Semi-bold", className: "font-semibold" },
            { value: "bold", label: "Bold", className: "font-bold" },
        ],
    },
    serif: {
        options: [
            { value: "normal", label: "Regular", className: "font-normal" },
            { value: "bold", label: "Bold", className: "font-bold" },
        ],
        map: {
            medium: "normal",
            semibold: "bold",
        },
    },
};

function SectionHeading({ children }: { children: React.ReactNode }) {
    return <h4 className="text-base font-semibold">{children}</h4>;
}

interface FieldsProps {
    newsletter: Newsletter;
    updateNewsletter: (fields: Partial<Newsletter>) => void;
    errors: ErrorMessages;
    clearError: (field: string) => void;
}

function ReplyToEmailField({ newsletter, updateNewsletter, errors, clearError }: FieldsProps) {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const settings = settingsData?.settings ?? [];
    const config = configData!.config;
    const [defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(settings, ["default_email_address", "support_email_address"]);

    // While editing we track a local value, so the render mapping ('newsletter'
    // / 'support' → concrete addresses) doesn't rewrite what's being typed.
    const [senderReplyTo, setSenderReplyTo] = useState(renderReplyToEmail(newsletter, config, supportEmailAddress, defaultEmailAddress) || "");

    const newsletterAddress = renderSenderEmail(newsletter, config, defaultEmailAddress);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSenderReplyTo(e.target.value);
        updateNewsletter({ sender_reply_to: e.target.value || "newsletter" });
    }, [updateNewsletter]);

    const onBlur = () => {
        // Update the senderReplyTo to the rendered value again
        const rendered = renderReplyToEmail(newsletter, config, supportEmailAddress, defaultEmailAddress) || "";
        setSenderReplyTo(rendered);
    };

    return (
        <TextField
            error={Boolean(errors.sender_reply_to)}
            hint={errors.sender_reply_to}
            maxLength={191}
            placeholder={newsletterAddress || ""}
            title="Reply-to email"
            value={senderReplyTo}
            onBlur={onBlur}
            onChange={onChange}
            onKeyDown={() => clearError("sender_reply_to")}
        />
    );
}

function SenderEmailField({ newsletter, updateNewsletter, errors, clearError }: FieldsProps) {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const settings = settingsData?.settings ?? [];
    const config = configData!.config;
    const [defaultEmailAddress] = getSettingValues<string>(settings, ["default_email_address"]);
    const newsletterAddress = renderSenderEmail(newsletter, config, defaultEmailAddress);

    // Self-hosters
    if (!isManagedEmail(config)) {
        return (
            <TextField
                error={Boolean(errors.sender_email)}
                hint={errors.sender_email}
                placeholder={newsletterAddress || ""}
                title="Sender email address"
                value={newsletter.sender_email || ""}
                onChange={(e) => updateNewsletter({ sender_email: e.target.value })}
                onKeyDown={() => clearError("sender_email")}
            />
        );
    }

    // Pro users with custom sending domains
    if (hasSendingDomain(config)) {
        return (
            <TextField
                error={Boolean(errors.sender_email)}
                hint={errors.sender_email}
                maxLength={191}
                placeholder={defaultEmailAddress}
                title="Sender email address"
                value={newsletter.sender_email || ""}
                onChange={(e) => updateNewsletter({ sender_email: e.target.value })}
                onKeyDown={() => clearError("sender_email")}
            />
        );
    }

    // Pro users without custom sending domains: the address isn't editable,
    // so no field is shown (the preview shows the managed address).
    return null;
}

function NewsletterDetailSidebar({ newsletter, onlyOne, updateNewsletter, errors, clearError }: FieldsProps & { onlyOne: boolean }) {
    const navigate = useNavigate();
    const { confirm, showLimit } = useConfirmation();
    const { mutateAsync: editNewsletter } = useEditNewsletter();
    const limiter = useLimiter();
    const { data: settingsData } = useBrowseSettings();
    const { data: siteResponse } = useBrowseSite();
    const settings = settingsData?.settings ?? [];
    const siteData = siteResponse?.site;
    const [icon, siteTitle] = getSettingValues<string>(settings, ["icon", "title"]);
    const { mutateAsync: uploadImage } = useUploadImage();
    const [selectedTab, setSelectedTab] = useState("generalSettings");
    const handleError = useSettingsHandleError();
    const { data: { newsletters: apiNewsletters } = {} } = useBrowseNewsletters();
    const commentsEnabled = ["all", "paid"].includes(getSettingValue(settings, "comments_enabled") || "");

    const activeNewsletters = (apiNewsletters || []).filter((n) => n.status === "active");

    const backgroundColorIsDark = () => {
        if (newsletter.background_color === "light") {
            return false;
        }
        return textColorForBackgroundColor(newsletter.background_color).hex().toLowerCase() === "#ffffff";
    };

    const confirmStatusChange = async () => {
        if (newsletter.status === "active") {
            confirm({
                title: "Archive newsletter",
                prompt: (
                    <>
                        <div className="mb-6">Your newsletter <strong>{newsletter.name}</strong> will no longer be visible to members or available as an option when publishing new posts.</div>
                        <div>Existing posts previously sent as this newsletter will remain unchanged.</div>
                    </>
                ),
                okLabel: "Archive",
                destructive: true,
                onOk: async () => {
                    try {
                        await editNewsletter({ ...newsletter, status: "archived" });
                    } catch (e) {
                        handleError(e);
                        throw e;
                    }
                    showToast({ type: "success", title: "Newsletter archived" });
                },
            });
        } else {
            try {
                await limiter.errorIfWouldGoOverLimit("newsletters");
            } catch (error) {
                if (error instanceof HostLimitError) {
                    showLimit({
                        prompt: error.message || "Your current plan doesn't support more newsletters.",
                        onOk: () => navigate("/pro", { crossApp: true }),
                    });
                    return;
                }
                throw error;
            }

            confirm({
                title: "Reactivate newsletter",
                prompt: (
                    <>Reactivating <strong>{newsletter.name}</strong> will immediately make it visible to members and re-enable it as an option when publishing new posts.</>
                ),
                okLabel: "Reactivate",
                onOk: async () => {
                    try {
                        await editNewsletter({ ...newsletter, status: "active" });
                    } catch (e) {
                        handleError(e);
                        throw e;
                    }
                    showToast({ type: "success", title: "Newsletter reactivated" });
                },
            });
        }
    };

    const headingFontWeightOptions = FONT_WEIGHT_OPTIONS[newsletter.title_font_category || "sans_serif"].options;

    // Not all weights exist for every font — fall back to the closest match.
    const getSelectedFontWeightOption = () => {
        const category = newsletter.title_font_category || "sans_serif";
        const fontWeight = newsletter.title_font_weight;
        const weightMap = FONT_WEIGHT_OPTIONS[category].map;
        const mappedWeight = weightMap ? (weightMap[fontWeight] || fontWeight) : fontWeight;
        const option = headingFontWeightOptions.find((o) => o.value === mappedWeight);
        return option || headingFontWeightOptions[0];
    };

    // Changing font category changes available weights, so map to the closest.
    const changeSelectedTitleFont = (categoryValue: string) => {
        const currentWeight = newsletter.title_font_weight;
        let newWeight = currentWeight;
        if (!FONT_WEIGHT_OPTIONS[categoryValue].options.find((o) => o.value === currentWeight)) {
            newWeight = FONT_WEIGHT_OPTIONS[categoryValue].map?.[currentWeight] || "bold";
        }

        updateNewsletter({
            title_font_category: categoryValue,
            title_font_weight: newWeight,
        });
    };

    const fontSelect = ({ label, value, options, testId, onChange }: { label: string; value: string; options: FontOption[]; testId?: string; onChange: (value: string) => void }) => (
        <div className="flex w-full items-center justify-between gap-2">
            <div className="shrink-0">{label}</div>
            <Field className="max-w-[200px]">
                <FieldLabel className="sr-only">{label}</FieldLabel>
                <Select value={value} onValueChange={onChange}>
                    <SelectTrigger aria-label={label} data-testid={testId}><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}><span className={option.className}>{option.label}</span></SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
        </div>
    );

    const toggleRow = ({ label, value, disabled, items, onChange }: {
        label: string;
        value: string;
        disabled?: boolean;
        items: Array<{ value: string; label: string; icon: React.ReactNode }>;
        onChange: (value: string) => void;
    }) => (
        <div className="flex w-full items-center justify-between">
            <div>{label}</div>
            <ToggleGroup type="single" value={value} onValueChange={(newValue) => {
                if (newValue) {
                    onChange(newValue);
                }
            }}>
                {items.map((item) => (
                    <ToggleGroupItem key={item.value} aria-label={item.label} disabled={disabled} title={item.label} value={item.value}>
                        {item.icon}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
        </div>
    );

    return (
        <div className="flex flex-col">
            <div className="px-7 pt-0 pb-7">
                <Tabs value={selectedTab} variant="underline" onValueChange={setSelectedTab}>
                    <TabsList className="sticky top-0 z-50 bg-background">
                        <TabsTrigger value="generalSettings">General</TabsTrigger>
                        <TabsTrigger value="content">Content</TabsTrigger>
                        <TabsTrigger value="design">Design</TabsTrigger>
                    </TabsList>
                    <TabsContent value="generalSettings">
                        <div className="mt-6 flex flex-col gap-3">
                            <SectionHeading>Name and description</SectionHeading>
                            <TextField
                                error={Boolean(errors.name)}
                                hint={errors.name}
                                maxLength={191}
                                placeholder="Weekly Roundup"
                                title="Name"
                                value={newsletter.name || ""}
                                onChange={(e) => updateNewsletter({ name: e.target.value })}
                                onKeyDown={() => clearError("name")}
                            />
                            <Field>
                                <FieldLabel htmlFor="newsletter-description">Description</FieldLabel>
                                <Textarea className="border-transparent bg-muted" id="newsletter-description" maxLength={2000} rows={2} value={newsletter.description || ""} onChange={(e) => updateNewsletter({ description: e.target.value })} />
                            </Field>
                        </div>
                        <div className="mt-6 flex flex-col gap-3">
                            <SectionHeading>Email info</SectionHeading>
                            <TextField maxLength={191} placeholder={siteTitle} title="Sender name" value={newsletter.sender_name || ""} onChange={(e) => updateNewsletter({ sender_name: e.target.value })} />
                            <SenderEmailField clearError={clearError} errors={errors} newsletter={newsletter} updateNewsletter={updateNewsletter} />
                            <ReplyToEmailField clearError={clearError} errors={errors} newsletter={newsletter} updateNewsletter={updateNewsletter} />
                        </div>
                        <div className="mt-6 flex flex-col gap-3">
                            <SectionHeading>Member settings</SectionHeading>
                            <Field orientation="horizontal">
                                <FieldLabel htmlFor="newsletter-subscribe-on-signup">Subscribe new members on signup</FieldLabel>
                                <Switch checked={Boolean(newsletter.subscribe_on_signup)} id="newsletter-subscribe-on-signup" onCheckedChange={(checked) => updateNewsletter({ subscribe_on_signup: checked })} />
                            </Field>
                        </div>
                        <div className="mt-10 mb-5">
                            {newsletter.status === "active" ? (!onlyOne && (
                                <Button className="px-0 text-destructive hover:bg-transparent hover:underline" disabled={activeNewsletters.length === 1} variant="ghost" onClick={() => void confirmStatusChange()}>
                                    Archive newsletter
                                </Button>
                            )) : (
                                <Button className="px-0 text-state-success hover:bg-transparent hover:underline" variant="ghost" onClick={() => void confirmStatusChange()}>
                                    Reactivate newsletter
                                </Button>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="content">
                        <div className="mt-6 flex flex-col gap-3">
                            <SectionHeading>Header</SectionHeading>
                            <div>
                                <h6 className="mb-2 text-sm font-medium">Header image</h6>
                                <div className="flex flex-col gap-1">
                                    <ImageUpload
                                        containerClassName="h-[66px] overflow-hidden"
                                        deleteButtonClassName="top-1! right-1!"
                                        fileUploadClassName="h-16"
                                        id="logo"
                                        imageURL={newsletter.header_image || undefined}
                                        onDelete={() => updateNewsletter({ header_image: null })}
                                        onUpload={async (file) => {
                                            try {
                                                const imageUrl = getImageUrl(await uploadImage({ file }));
                                                updateNewsletter({ header_image: imageUrl });
                                            } catch (e) {
                                                handleError(e);
                                            }
                                        }}
                                    >
                                        <LucideIcon.Image className="size-5" />
                                    </ImageUpload>
                                    <FieldDescription>1,200×600 recommended. Use a transparent PNG for best results on any background.</FieldDescription>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                {icon && (
                                    <Field orientation="horizontal">
                                        <FieldLabel htmlFor="newsletter-show-header-icon">Publication icon</FieldLabel>
                                        <Switch checked={Boolean(newsletter.show_header_icon)} id="newsletter-show-header-icon" onCheckedChange={(checked) => updateNewsletter({ show_header_icon: checked })} />
                                    </Field>
                                )}
                                <Field orientation="horizontal">
                                    <FieldLabel htmlFor="newsletter-show-header-title">Publication title</FieldLabel>
                                    <Switch checked={Boolean(newsletter.show_header_title)} id="newsletter-show-header-title" onCheckedChange={(checked) => updateNewsletter({ show_header_title: checked })} />
                                </Field>
                                <Field orientation="horizontal">
                                    <FieldLabel htmlFor="newsletter-show-header-name">Newsletter name</FieldLabel>
                                    <Switch checked={Boolean(newsletter.show_header_name)} id="newsletter-show-header-name" onCheckedChange={(checked) => updateNewsletter({ show_header_name: checked })} />
                                </Field>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2">
                            <SectionHeading>Title section</SectionHeading>
                            <Field orientation="horizontal">
                                <FieldLabel htmlFor="newsletter-show-post-title">Post title</FieldLabel>
                                <Switch checked={Boolean(newsletter.show_post_title_section)} id="newsletter-show-post-title" onCheckedChange={(checked) => updateNewsletter({ show_post_title_section: checked })} />
                            </Field>
                            {newsletter.show_post_title_section && (
                                <Field orientation="horizontal">
                                    <FieldLabel htmlFor="newsletter-show-excerpt">Post excerpt</FieldLabel>
                                    <Switch checked={Boolean(newsletter.show_excerpt)} id="newsletter-show-excerpt" onCheckedChange={(checked) => updateNewsletter({ show_excerpt: checked })} />
                                </Field>
                            )}
                            <Field orientation="horizontal">
                                <FieldLabel htmlFor="newsletter-show-feature-image">Feature image</FieldLabel>
                                <Switch checked={Boolean(newsletter.show_feature_image)} id="newsletter-show-feature-image" onCheckedChange={(checked) => updateNewsletter({ show_feature_image: checked })} />
                            </Field>
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                            <SectionHeading>Footer</SectionHeading>
                            <div className="flex flex-col gap-5">
                                <Field orientation="horizontal">
                                    <FieldLabel htmlFor="newsletter-feedback-enabled">Ask your readers for feedback</FieldLabel>
                                    <Switch checked={Boolean(newsletter.feedback_enabled)} id="newsletter-feedback-enabled" onCheckedChange={(checked) => updateNewsletter({ feedback_enabled: checked })} />
                                </Field>
                                {commentsEnabled && (
                                    <Field orientation="horizontal">
                                        <FieldLabel htmlFor="newsletter-show-comment-cta">Add a link to your comments</FieldLabel>
                                        <Switch checked={Boolean(newsletter.show_comment_cta)} id="newsletter-show-comment-cta" onCheckedChange={(checked) => updateNewsletter({ show_comment_cta: checked })} />
                                    </Field>
                                )}
                                <Field orientation="horizontal">
                                    <FieldLabel htmlFor="newsletter-show-share-button">Show share button</FieldLabel>
                                    <Switch checked={Boolean(newsletter.show_share_button)} id="newsletter-show-share-button" onCheckedChange={(checked) => updateNewsletter({ show_share_button: checked })} />
                                </Field>
                                <Field orientation="horizontal">
                                    <FieldLabel htmlFor="newsletter-show-latest-posts">Share your latest posts</FieldLabel>
                                    <Switch checked={Boolean(newsletter.show_latest_posts)} id="newsletter-show-latest-posts" onCheckedChange={(checked) => updateNewsletter({ show_latest_posts: checked })} />
                                </Field>
                                <Field orientation="horizontal">
                                    <FieldLabel htmlFor="newsletter-show-subscription-details">Show subscription details</FieldLabel>
                                    <Switch checked={Boolean(newsletter.show_subscription_details)} id="newsletter-show-subscription-details" onCheckedChange={(checked) => updateNewsletter({ show_subscription_details: checked })} />
                                </Field>
                            </div>
                            <Field>
                                <FieldLabel>Email footer</FieldLabel>
                                <AnnouncementContentEditor
                                    placeholder=" "
                                    value={newsletter.footer_content || ""}
                                    onChange={(html) => updateNewsletter({ footer_content: html })}
                                />
                                <FieldDescription>Any extra information or legal text</FieldDescription>
                            </Field>
                        </div>
                        <Separator className="mt-6" />
                        <div className="my-5 flex w-full items-start gap-2">
                            <LucideIcon.Heart className="mt-0.5 size-5 shrink-0 text-destructive" />
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldLabel htmlFor="newsletter-show-badge">Promote independent publishing</FieldLabel>
                                    <FieldDescription>Show you&apos;re a part of the indie publishing movement with a small badge in the footer</FieldDescription>
                                </FieldContent>
                                <Switch checked={Boolean(newsletter.show_badge)} id="newsletter-show-badge" onCheckedChange={(checked) => updateNewsletter({ show_badge: checked })} />
                            </Field>
                        </div>
                    </TabsContent>
                    <TabsContent value="design">
                        <div className="mt-6 flex flex-col gap-2">
                            <SectionHeading>Global</SectionHeading>
                            <div className="mb-1">
                                <ColorPickerField
                                    direction="rtl"
                                    swatches={[
                                        { hex: "#ffffff", value: "light", title: "White" },
                                    ]}
                                    title="Background color"
                                    value={newsletter.background_color || "light"}
                                    onChange={(color) => updateNewsletter({ background_color: color! })}
                                />
                            </div>
                            {fontSelect({ label: "Heading font", value: newsletter.title_font_category, options: FONT_OPTIONS, onChange: changeSelectedTitleFont })}
                            {fontSelect({ label: "Heading weight", value: getSelectedFontWeightOption().value, options: headingFontWeightOptions, onChange: (value) => updateNewsletter({ title_font_weight: value }) })}
                            {fontSelect({ label: "Body font", value: newsletter.body_font_category, options: FONT_OPTIONS, testId: "body-font-select", onChange: (value) => updateNewsletter({ body_font_category: value }) })}
                        </div>
                        <div className="mt-6 flex flex-col gap-2">
                            <SectionHeading>Header</SectionHeading>
                            <div className="mb-1">
                                <ColorPickerField
                                    direction="rtl"
                                    swatches={[
                                        { value: "transparent", title: "Transparent", hex: "#00000000" },
                                    ]}
                                    title="Header background color"
                                    value={newsletter.header_background_color || "transparent"}
                                    onChange={(color) => updateNewsletter({ header_background_color: color! })}
                                />
                            </div>
                            <div className="mb-1">
                                <ColorPickerField
                                    direction="rtl"
                                    swatches={[
                                        { value: null, title: "Auto", hex: backgroundColorIsDark() ? "#ffffff" : "#000000" },
                                        { value: "accent", title: "Accent", hex: siteData?.accent_color || "#000000" },
                                    ]}
                                    title="Post title color"
                                    value={newsletter.post_title_color}
                                    onChange={(color) => updateNewsletter({ post_title_color: color })}
                                />
                            </div>
                            {toggleRow({
                                label: "Title alignment",
                                value: newsletter.title_alignment,
                                disabled: !newsletter.show_post_title_section,
                                items: [
                                    { value: "left", label: "Align left", icon: <LucideIcon.AlignLeft className="size-3.5" /> },
                                    { value: "center", label: "Align center", icon: <LucideIcon.AlignCenter className="size-3.5" /> },
                                ],
                                onChange: (value) => updateNewsletter({ title_alignment: value }),
                            })}
                        </div>
                        <div className="mt-6 flex flex-col gap-2">
                            <SectionHeading>Body</SectionHeading>
                            <div className="mb-1">
                                <ColorPickerField
                                    direction="rtl"
                                    swatches={[
                                        { value: null, title: "Auto", hex: backgroundColorIsDark() ? "#ffffff" : "#000000" },
                                        { value: "accent", title: "Accent", hex: siteData?.accent_color || "#000000" },
                                    ]}
                                    title="Section title color"
                                    value={newsletter.section_title_color}
                                    onChange={(color) => updateNewsletter({ section_title_color: color })}
                                />
                            </div>
                            <div className="mb-1">
                                <ColorPickerField
                                    direction="rtl"
                                    swatches={[
                                        { value: "accent", title: "Accent", hex: siteData?.accent_color || "#000000" },
                                        { value: null, title: "Auto", hex: backgroundColorIsDark() ? "#ffffff" : "#000000" },
                                    ]}
                                    title="Button color"
                                    value={newsletter.button_color}
                                    onChange={(color) => updateNewsletter({ button_color: color })}
                                />
                            </div>
                            {toggleRow({
                                label: "Button style",
                                value: newsletter.button_style || "fill",
                                items: [
                                    { value: "fill", label: "Fill", icon: <LucideIcon.Squircle className="size-3.5 fill-current" /> },
                                    { value: "outline", label: "Outline", icon: <LucideIcon.Squircle className="size-3.5" /> },
                                ],
                                onChange: (value) => updateNewsletter({ button_style: value }),
                            })}
                            {toggleRow({
                                label: "Button corners",
                                value: newsletter.button_corners || "rounded",
                                items: [
                                    { value: "square", label: "Square", icon: <LucideIcon.Square className="size-3.5" /> },
                                    { value: "rounded", label: "Rounded", icon: <LucideIcon.Squircle className="size-3.5" /> },
                                    { value: "pill", label: "Pill", icon: <LucideIcon.Circle className="size-3.5" /> },
                                ],
                                onChange: (value) => updateNewsletter({ button_corners: value }),
                            })}
                            <div className="mb-1">
                                <ColorPickerField
                                    direction="rtl"
                                    swatches={[
                                        { value: "accent", title: "Accent", hex: siteData?.accent_color || "#000000" },
                                        { value: null, title: "Auto", hex: backgroundColorIsDark() ? "#ffffff" : "#000000" },
                                    ]}
                                    title="Link color"
                                    value={newsletter.link_color}
                                    onChange={(color) => updateNewsletter({ link_color: color })}
                                />
                            </div>
                            {toggleRow({
                                label: "Link style",
                                value: newsletter.link_style || "underline",
                                items: [
                                    { value: "underline", label: "Underline", icon: <LucideIcon.Underline className="size-3.5" /> },
                                    { value: "regular", label: "Regular", icon: <LucideIcon.Type className="size-3.5" /> },
                                    { value: "bold", label: "Bold", icon: <LucideIcon.Bold className="size-3.5" /> },
                                ],
                                onChange: (value) => updateNewsletter({ link_style: value }),
                            })}
                            {toggleRow({
                                label: "Image corners",
                                value: newsletter.image_corners || "square",
                                items: [
                                    { value: "square", label: "Square", icon: <LucideIcon.Square className="size-3.5" /> },
                                    { value: "rounded", label: "Rounded", icon: <LucideIcon.Squircle className="size-3.5" /> },
                                ],
                                onChange: (value) => updateNewsletter({ image_corners: value }),
                            })}
                            <div className="mb-1">
                                <ColorPickerField
                                    direction="rtl"
                                    swatches={[
                                        { value: "light", title: "Light", hex: "#e0e7eb" },
                                        { value: "accent", title: "Accent", hex: siteData?.accent_color || "#000000" },
                                    ]}
                                    title="Divider color"
                                    value={newsletter.divider_color || "light"}
                                    onChange={(color) => updateNewsletter({ divider_color: color })}
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function NewsletterDetailDialogContent({ newsletter, onlyOne }: { newsletter: Newsletter; onlyOne: boolean }) {
    const navigate = useNavigate();
    const { confirm } = useConfirmation();
    const { data: configData } = useBrowseConfig();
    const config = configData?.config;
    const { mutateAsync: editNewsletter } = useEditNewsletter();
    const hasAutomations = useFeatureFlag("automations");
    const returnRoute = hasAutomations ? "/settings/emails" : "/settings/newsletters";
    const handleError = useSettingsHandleError();
    const [device, setDevice] = useState<PreviewDevice>("desktop");

    const { formState, saveState, updateForm, setFormState, handleSave, errors, clearError, okProps } = useForm({
        initialState: newsletter,
        savingDelay: 500,
        onSave: async () => {
            const { meta: { sent_email_verification: [emailToVerify] = [] } = {} } = await editNewsletter(formState);

            if (emailToVerify === "sender_email" || emailToVerify === "sender_reply_to") {
                showToast({
                    type: "info",
                    message: "We've sent a confirmation email to the new address.",
                });
            }
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name) {
                newErrors.name = "A name is required for your newsletter";
            }

            if (formState.sender_email && !validator.isEmail(formState.sender_email)) {
                newErrors.sender_email = "Enter a valid email address";
            } else if (formState.sender_email && config && hasSendingDomain(config) && formState.sender_email.split("@")[1] !== sendingDomain(config)) {
                newErrors.sender_email = `Email address must end with @${sendingDomain(config)}`;
            }

            if (formState.sender_reply_to && !validator.isEmail(formState.sender_reply_to) && !["newsletter", "support"].includes(formState.sender_reply_to)) {
                newErrors.sender_reply_to = "Enter a valid email address";
            }

            return newErrors;
        },
    });

    const updateNewsletter = useCallback((fields: Partial<Newsletter>) => {
        updateForm((state) => ({ ...state, ...fields }));
    }, [updateForm]);

    // Reset the form when the cached newsletter changes (e.g. after the
    // archive/reactivate flow edits it) — the legacy contract.
    useEffect(() => {
        setFormState(() => newsletter);
    }, [setFormState, newsletter]);

    if (!config) {
        return null;
    }

    return (
        <PreviewDialog
            buttonsDisabled={okProps.disabled}
            device={device}
            okLabel={okProps.label || "Save"}
            preview={(
                <div className="flex size-full flex-col overflow-y-auto bg-muted">
                    <NewsletterPreview newsletter={formState} />
                </div>
            )}
            sidebar={(
                <NewsletterDetailSidebar
                    clearError={clearError}
                    errors={errors}
                    newsletter={formState}
                    updateNewsletter={updateNewsletter}
                    onlyOne={onlyOne}
                />
            )}
            sidebarPadding={false}
            testId="newsletter-modal"
            title="Newsletter"
            onClose={() => {
                confirmIfDirty(confirm, saveState === "unsaved", () => navigate(returnRoute));
            }}
            onDeviceChange={setDevice}
            onOk={() => void handleSave({ fakeWhenUnchanged: true })}
        />
    );
}

export function NewsletterDetailDialog() {
    const { newsletterId } = useParams();
    const { data: { newsletters, isEnd } = {}, fetchNextPage } = useBrowseNewsletters();
    const newsletter = newsletters?.find(({ id }) => id === newsletterId);

    useEffect(() => {
        if (!newsletter && !isEnd) {
            void fetchNextPage();
        }
    }, [fetchNextPage, isEnd, newsletter]);

    if (!newsletter) {
        return null;
    }

    return <NewsletterDetailDialogContent key={newsletter.id} newsletter={newsletter} onlyOne={newsletters!.length === 1} />;
}
