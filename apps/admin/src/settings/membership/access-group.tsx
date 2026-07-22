import { useState } from "react";
import {
    Banner,
    Combobox,
    ComboboxContent,
    ComboboxTrigger,
    ComboboxValue,
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    MultiSelectCombobox,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    Button as ShadeButton,
} from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { getSettingValues, isSettingReadOnly, useBrowseSettings, useRegenerateAccessCode } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseTiers } from "@tryghost/admin-x-framework/api/tiers";
import { useNavigate } from "@tryghost/admin-x-framework";

import { SettingGroup, SettingGroupContent } from "@/settings/app/shared/setting-group";
import { showToast } from "@/settings/app/shared/toast";
import { useLimiter } from "@/settings/app/shared/use-limiter";
import { useSettingGroup } from "@/settings/app/shared/use-setting-group";

/**
 * The Access group, ported from the legacy membership/access.tsx: site
 * visibility (incl. locked private mode + access code regeneration),
 * subscription access, default post access with specific tiers, and
 * commenting.
 */

const SITE_VISIBILITY_OPTIONS = [
    { value: "public", label: "Public", hint: "Anyone can visit and read the website" },
    { value: "private", label: "Private", hint: "Access code required" },
];

const MEMBERS_SIGNUP_ACCESS_OPTIONS = [
    { value: "all", label: "Public", hint: "Anyone can sign up and log in" },
    { value: "paid", label: "Paid-members only", hint: "A paid Stripe subscription is required to sign up" },
    { value: "invite", label: "Invite-only", hint: "People can sign in but won't be able to sign up" },
    { value: "none", label: "Nobody", hint: "Disable all member features, including newsletters" },
];

const DEFAULT_CONTENT_VISIBILITY_OPTIONS = [
    { value: "public", label: "Public", hint: "All site visitors to your site, no login required" },
    { value: "members", label: "Members only", hint: "All logged-in members" },
    { value: "paid", label: "Paid-members only", hint: "Only logged-in members with an active Stripe subscription" },
    { value: "tiers", label: "Specific tiers", hint: "Members with any of the selected tiers" },
];

const COMMENTS_ENABLED_OPTIONS = [
    { value: "all", label: "All members", hint: "Logged-in members" },
    { value: "paid", label: "Paid-members only", hint: "Only logged-in members with an active Stripe subscription" },
    { value: "off", label: "Nobody", hint: "Disable commenting completely" },
];

const renderAccessOptions = (options: Array<{ value: string; label: string; hint: string }>) => options.map((option) => (
    <SelectItem key={option.value} value={option.value}>
        <span className="flex flex-col">
            <span>{option.label}</span>
            <span className="text-sm text-muted-foreground">{option.hint}</span>
        </span>
    </SelectItem>
));

const getAccessOptionLabel = (options: Array<{ value: string; label: string }>, value: string) => options.find((option) => option.value === value)?.label;

export function AccessGroup({ keywords }: { keywords: string[] }) {
    const [tiersOpen, setTiersOpen] = useState(false);
    const navigate = useNavigate();
    const { data: settingsData } = useBrowseSettings();
    const settings = settingsData?.settings ?? [];
    const limiter = useLimiter();
    const isTrialMode = limiter.isDisabled("publicSiteAccess");
    const isPrivateLocked = isSettingReadOnly(settings, "is_private") || isSettingReadOnly(settings, "password");
    const { mutateAsync: regenerateAccessCode } = useRegenerateAccessCode();
    const [isRegenerating, setIsRegenerating] = useState(false);
    const {
        localSettings,
        isEditing,
        saveState,
        siteData,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange,
        errors,
        clearError,
    } = useSettingGroup({
        onValidate: () => {
            if (isPrivate && !password) {
                return { password: "Enter an access code" };
            }
            return {};
        },
    });

    const [isPrivate, password, membersSignupAccess, defaultContentVisibility, defaultContentVisibilityTiers, commentsEnabled] = getSettingValues(localSettings, [
        "is_private", "password", "members_signup_access", "default_content_visibility", "default_content_visibility_tiers", "comments_enabled",
    ]) as [boolean, string, string, string, string, string];
    const [savedIsPrivate, savedPublicHash] = getSettingValues(settings, ["is_private", "public_hash"]) as [boolean, string];
    const effectiveIsPrivate = isPrivateLocked ? true : isPrivate;

    const { data: { tiers } = {} } = useBrowseTiers();

    const tierOptionGroups = [
        {
            label: "Active Tiers",
            options: tiers?.filter(({ active }) => active).map((tier) => ({ value: tier.id, label: tier.name })) || [],
        },
        {
            label: "Archived Tiers",
            options: tiers?.filter(({ active }) => !active).map((tier) => ({ value: tier.id, label: tier.name })) || [],
        },
    ];
    const contentVisibilityTiers = JSON.parse(defaultContentVisibilityTiers || "[]") as string[];
    const tierOptions = tierOptionGroups.flatMap((group) => group.options.map((option) => ({ ...option, metadata: { group: group.label } })));
    const selectedTierLabels = tierOptions.filter((option) => contentVisibilityTiers.includes(option.value)).map((option) => option.label).join(", ");
    const privateRssUrl = (savedIsPrivate && effectiveIsPrivate && siteData?.url && savedPublicHash) ? `${siteData.url.replace(/\/$/, "")}/${savedPublicHash}/rss` : null;

    const setSelectedTiers = (selectedTiers: string[]) => {
        updateSetting("default_content_visibility_tiers", JSON.stringify(selectedTiers));
    };

    const handleRegenerateAccessCode = async () => {
        setIsRegenerating(true);
        try {
            const response = await regenerateAccessCode(null);
            const regeneratedAccessCode = response.settings.find((setting) => setting.key === "password")?.value;

            if (typeof regeneratedAccessCode === "string") {
                updateSetting("password", regeneratedAccessCode);
                clearError("password");
            }
        } catch {
            showToast({ type: "error", title: "Could not regenerate access code" });
        } finally {
            setIsRegenerating(false);
        }
    };

    const form = (
        <SettingGroupContent className="gap-y-4" columns={1}>
            {isTrialMode && (
                <div className="-m-5 overflow-hidden p-5">
                    <Banner className="mb-2 flex w-full cursor-default flex-col gap-4 border-0 p-6 pt-5 transition-none hover:translate-y-0 hover:scale-100 md:flex-row md:items-center md:justify-between" size="lg" variant="gradient">
                        <div>
                            <div className="text-base font-semibold">Pre-launch mode</div>
                            <div className="mt-2 text-muted-foreground">
                                During your free trial, a private access code is required to browse your site. When you&apos;re ready to launch, pick a plan to upgrade your account and make everything public.
                            </div>
                        </div>
                        <ShadeButton className="shrink-0 self-start md:self-center" onClick={() => navigate("/pro/billing/plans", { crossApp: true })}>Upgrade now</ShadeButton>
                    </Banner>
                </div>
            )}
            <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Who should be able to browse your site?</div>
                <div className="w-full md:flex-1">
                    <Field className={isPrivateLocked ? "relative z-10" : undefined} data-disabled={isPrivateLocked || undefined}>
                        <FieldLabel className="sr-only">Who should be able to browse your site?</FieldLabel>
                        <Select disabled={isPrivateLocked} value={effectiveIsPrivate ? "private" : "public"} onValueChange={(value) => {
                            updateSetting("is_private", value === "private");
                            handleEditingChange(true);
                        }}>
                            <SelectTrigger aria-label="Who should be able to browse your site?" className="border-transparent bg-muted hover:bg-muted" data-testid="site-visibility-select"><SelectValue>{getAccessOptionLabel(SITE_VISIBILITY_OPTIONS, effectiveIsPrivate ? "private" : "public")}</SelectValue></SelectTrigger>
                            <SelectContent>{renderAccessOptions(SITE_VISIBILITY_OPTIONS)}</SelectContent>
                        </Select>
                    </Field>
                </div>
            </div>
            {(effectiveIsPrivate || isPrivateLocked) && (
                <div className="flex flex-col content-center items-center gap-4 md:flex-row md:items-start">
                    <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px] md:pt-3">What access code should visitors use?</div>
                    <div className="w-full md:flex-1">
                        <Field className={isPrivateLocked ? "relative z-10" : undefined} data-disabled={isPrivateLocked || undefined} data-invalid={Boolean(errors.password) || undefined}>
                            <FieldLabel className="sr-only" htmlFor="site-access-code">Access code</FieldLabel>
                            <InputGroup className="border-transparent bg-muted" data-disabled={isPrivateLocked || undefined} data-invalid={Boolean(errors.password) || undefined}>
                                <InputGroupInput
                                    aria-invalid={Boolean(errors.password) || undefined}
                                    data-testid="site-access-code"
                                    disabled={isPrivateLocked}
                                    id="site-access-code"
                                    placeholder="Enter access code"
                                    value={password || ""}
                                    onChange={(e) => {
                                        updateSetting("password", e.target.value);
                                        handleEditingChange(true);
                                    }}
                                    onKeyDown={() => clearError("password")}
                                />
                                <InputGroupAddon align="inline-end">
                                    <InputGroupButton
                                        aria-label="Regenerate access code"
                                        data-testid="regenerate-access-code"
                                        disabled={isRegenerating}
                                        size="icon-xs"
                                        onClick={() => void handleRegenerateAccessCode()}
                                    >
                                        <LucideIcon.RefreshCw aria-hidden={true} />
                                    </InputGroupButton>
                                </InputGroupAddon>
                            </InputGroup>
                            {errors.password && <FieldError>{errors.password}</FieldError>}
                        </Field>
                        {privateRssUrl && !isPrivateLocked && (
                            <FieldDescription className="mt-2">
                                A private RSS feed is available <a className="text-primary" href={privateRssUrl} rel="noopener noreferrer" target="_blank">here</a>
                            </FieldDescription>
                        )}
                    </div>
                </div>
            )}
            <Separator />
            <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Who should be able to subscribe to your site?</div>
                <div className="w-full md:flex-1">
                    <Field>
                        <FieldLabel className="sr-only">Who should be able to subscribe to your site?</FieldLabel>
                        <Select value={membersSignupAccess} onValueChange={(value) => {
                            updateSetting("members_signup_access", value);
                            handleEditingChange(true);
                        }}>
                            <SelectTrigger aria-label="Who should be able to subscribe to your site?" className="border-transparent bg-muted hover:bg-muted" data-testid="subscription-access-select"><SelectValue>{getAccessOptionLabel(MEMBERS_SIGNUP_ACCESS_OPTIONS, membersSignupAccess)}</SelectValue></SelectTrigger>
                            <SelectContent>{renderAccessOptions(MEMBERS_SIGNUP_ACCESS_OPTIONS)}</SelectContent>
                        </Select>
                    </Field>
                </div>
            </div>
            <Separator />
            <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Who should have access to new posts?</div>
                <div className="w-full md:flex-1">
                    <Field>
                        <FieldLabel className="sr-only">Who should have access to new posts?</FieldLabel>
                        <Select value={defaultContentVisibility} onValueChange={(value) => {
                            updateSetting("default_content_visibility", value);
                            handleEditingChange(true);
                        }}>
                            <SelectTrigger aria-label="Who should have access to new posts?" className="border-transparent bg-muted hover:bg-muted" data-testid="default-post-access-select"><SelectValue>{getAccessOptionLabel(DEFAULT_CONTENT_VISIBILITY_OPTIONS, defaultContentVisibility)}</SelectValue></SelectTrigger>
                            <SelectContent>{renderAccessOptions(DEFAULT_CONTENT_VISIBILITY_OPTIONS)}</SelectContent>
                        </Select>
                    </Field>
                </div>
            </div>
            {defaultContentVisibility === "tiers" && (
                <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                    <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Select specific tiers</div>
                    <div className="w-full md:flex-1">
                        <Field>
                            <FieldLabel className="sr-only">Select specific tiers</FieldLabel>
                            <Combobox open={tiersOpen} onOpenChange={setTiersOpen}>
                                <ComboboxTrigger aria-label="Select specific tiers" className="border-transparent bg-muted hover:bg-muted" data-testid="tiers-select">
                                    <ComboboxValue placeholder={!selectedTierLabels}>{selectedTierLabels || "Select..."}</ComboboxValue>
                                </ComboboxTrigger>
                                <ComboboxContent>
                                    <MultiSelectCombobox
                                        groupBy={(option) => option.metadata?.group as string | undefined}
                                        options={tierOptions}
                                        values={contentVisibilityTiers}
                                        onChange={(values) => {
                                            setSelectedTiers(values);
                                            handleEditingChange(true);
                                        }}
                                    />
                                </ComboboxContent>
                            </Combobox>
                        </Field>
                    </div>
                </div>
            )}
            <Separator />
            <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Who can comment on posts?</div>
                <div className="w-full md:flex-1">
                    <Field>
                        <FieldLabel className="sr-only">Who can comment on posts?</FieldLabel>
                        <Select value={commentsEnabled} onValueChange={(value) => {
                            updateSetting("comments_enabled", value);
                            handleEditingChange(true);
                        }}>
                            <SelectTrigger aria-label="Who can comment on posts?" className="border-transparent bg-muted hover:bg-muted" data-testid="commenting-select"><SelectValue>{getAccessOptionLabel(COMMENTS_ENABLED_OPTIONS, commentsEnabled)}</SelectValue></SelectTrigger>
                            <SelectContent>{renderAccessOptions(COMMENTS_ENABLED_OPTIONS)}</SelectContent>
                        </Select>
                    </Field>
                </div>
            </div>
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description="Set up who can browse your site, subscribe, read posts, and comment"
            isEditing={isEditing}
            keywords={keywords}
            navid="members"
            saveState={saveState}
            testId="access"
            title="Access"
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {form}
        </SettingGroup>
    );
}
