import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tryghost/shade/components";
import { type Dirtyable, useForm } from "@tryghost/admin-x-framework/hooks";
import { type Setting, type SettingValue, getSettingValues, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";
import { type Tier, useBrowseTiers, useEditTier } from "@tryghost/admin-x-framework/api/tiers";
import { fullEmailAddress, useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useLocation, useNavigate } from "@tryghost/admin-x-framework";
import { verifyEmailToken } from "@tryghost/admin-x-framework/api/email-verification";
import { getPortalPreviewUrl } from "@tryghost/admin-x-settings/src/utils/get-portal-preview-url";

import { PortalAccountPage } from "./portal-account-page";
import { PortalFrame } from "./portal-frame";
import { PortalLinks } from "./portal-links";
import { PortalLookAndFeel } from "./portal-look-and-feel";
import { PortalSignupOptions } from "./portal-signup-options";
import { type PreviewDevice, PreviewDialog } from "@/settings/site/preview-chrome";
import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The routed portal dialog (`/settings/portal/edit`), ported from the legacy
 * portal/portal-modal.tsx on the shared PreviewDialog chrome: tabbed settings
 * (signup options / look & feel / account page) beside the live portal
 * preview, whose iframe params re-render on every settings change.
 */

function PortalDialogContent({ settings }: { settings: Setting[] }) {
    const navigate = useNavigate();
    const { search } = useLocation();
    const { confirm } = useConfirmation();
    const handleError = useSettingsHandleError();

    const [selectedPreviewTab, setSelectedPreviewTab] = useState("signup");
    const [selectedSidebarTab, setSelectedSidebarTab] = useState("signupOptions");
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");

    const { data: siteResponse } = useBrowseSite();
    const { data: configData } = useBrowseConfig();
    const siteData = siteResponse?.site ?? null;
    const config = configData?.config;
    const { mutateAsync: editSettings } = useEditSettings();
    const { data: { tiers: allTiers } = {} } = useBrowseTiers();

    const { mutateAsync: editTier } = useEditTier();
    const { mutateAsync: verifyToken } = verifyEmailToken();

    const verifyEmail = new URLSearchParams(search).get("verifyEmail");

    useEffect(() => {
        const checkToken = async ({ token }: { token: string }) => {
            try {
                const { settings: verifiedSettings } = await verifyToken({ token });
                const [supportEmail] = getSettingValues<string>(verifiedSettings, ["members_support_address"]);
                confirm({
                    title: "Support address verified",
                    prompt: <>Your support email address has been changed to <strong>{supportEmail}</strong>.</>,
                    okLabel: "Close",
                    cancelLabel: "",
                    onOk: () => {},
                });
            } catch (e) {
                let prompt = "There was an error verifying your email address. Please try again.";

                if (e instanceof Error && e.message === "Token expired") {
                    prompt = "Verification link has expired.";
                }
                confirm({
                    title: "Error verifying support address",
                    prompt,
                    okLabel: "Close",
                    cancelLabel: "",
                    onOk: () => {},
                });
                handleError(e, { withToast: false });
            }
        };
        if (verifyEmail) {
            void checkToken({ token: verifyEmail });
        }
         
    }, [verifyEmail]);

    const { formState, setFormState, saveState, handleSave, updateForm, okProps } = useForm<{ settings: Dirtyable<Setting>[]; tiers: Dirtyable<Tier>[] }>({
        initialState: {
            settings,
            tiers: allTiers || [],
        },

        savingDelay: 500,

        onSave: async () => {
            await Promise.all(formState.tiers.filter(({ dirty }) => dirty).map((tier) => editTier(tier)));
            setFormState((state) => ({ ...state, tiers: formState.tiers.map((tier) => ({ ...tier, dirty: false })) }));

            const changedSettings = formState.settings.filter((setting) => setting.dirty);

            if (!changedSettings.length) {
                return;
            }

            const { meta, settings: currentSettings } = await editSettings(changedSettings);
            setFormState((state) => ({ ...state, settings: formState.settings.map((setting) => ({ ...setting, dirty: false })) }));

            if (meta?.sent_email_verification) {
                const newEmail = formState.settings.find((setting) => setting.key === "members_support_address")?.value;
                const currentEmail = currentSettings.find((setting) => setting.key === "support_email_address")?.value ||
                    fullEmailAddress(currentSettings.find((setting) => setting.key === "members_support_address")?.value?.toString() || "noreply", siteData!, config!);

                confirm({
                    title: "Confirm email address",
                    prompt: (
                        <>
                            We&apos;ve sent a confirmation email to <strong>{newEmail}</strong>.
                            Until verified, your support email address will remain {currentEmail}.
                        </>
                    ),
                    okLabel: "Close",
                    cancelLabel: "",
                    onOk: () => {},
                });
            }
        },

        onSaveError: handleError,
    });

    useEffect(() => {
        if (!formState.tiers.length && allTiers?.length) {
            setFormState((state) => ({ ...state, tiers: allTiers }));
        }
    }, [allTiers, formState.tiers, setFormState]);

    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    const updateSetting = (key: string, value: SettingValue) => {
        updateForm((state) => ({
            ...state,
            settings: state.settings.map((setting) => (
                setting.key === key ? { ...setting, value, dirty: true } : setting
            )),
        }));
    };

    const setError = (key: string, error: string | undefined) => {
        setErrors((state) => ({ ...state, [key]: error }));
    };

    const updateTier = (newTier: Tier) => {
        updateForm((state) => ({
            ...state,
            tiers: state.tiers.map((tier) => (
                tier.id === newTier.id ? { ...newTier, dirty: true } : tier
            )),
        }));
    };

    const onSelectURL = (id: string) => {
        setSelectedPreviewTab(id);
        // Sync sidebar tab with preview tab
        if (id === "signup") {
            setSelectedSidebarTab("signupOptions");
        } else if (id === "account") {
            setSelectedSidebarTab("accountPage");
        }
    };

    const onSidebarTabChange = (id: string) => {
        setSelectedSidebarTab(id);
        // Sync preview tab with sidebar tab
        if (id === "signupOptions") {
            setSelectedPreviewTab("signup");
        } else if (id === "accountPage") {
            setSelectedPreviewTab("account");
        }
    };

    const href = (siteData && config) ? getPortalPreviewUrl({
        settings: formState.settings,
        tiers: formState.tiers,
        selectedTab: selectedPreviewTab,
        siteData,
        config,
    }) : null;

    const preview = selectedPreviewTab === "links"
        ? <PortalLinks />
        : <PortalFrame href={href || ""} selectedTab={selectedPreviewTab} />;

    const sidebar = (
        <div className="pt-4">
            <Tabs value={selectedSidebarTab} variant="underline" onValueChange={onSidebarTabChange}>
                <TabsList>
                    <TabsTrigger value="signupOptions">Signup options</TabsTrigger>
                    <TabsTrigger value="lookAndFeel">Look &amp; feel</TabsTrigger>
                    <TabsTrigger value="accountPage">Account page</TabsTrigger>
                </TabsList>
                <TabsContent value="signupOptions">
                    <PortalSignupOptions
                        errors={errors}
                        localSettings={formState.settings}
                        localTiers={formState.tiers}
                        setError={setError}
                        updateSetting={updateSetting}
                        updateTier={updateTier}
                    />
                </TabsContent>
                <TabsContent value="lookAndFeel"><PortalLookAndFeel localSettings={formState.settings} updateSetting={updateSetting} /></TabsContent>
                <TabsContent value="accountPage"><PortalAccountPage errors={errors} localSettings={formState.settings} setError={setError} updateSetting={updateSetting} /></TabsContent>
            </Tabs>
        </div>
    );

    const requestClose = () => {
        confirmIfDirty(confirm, saveState === "unsaved", () => navigate("/settings/portal"));
    };

    return (
        <PreviewDialog
            buttonsDisabled={okProps.disabled}
            device={previewDevice}
            okLabel={okProps.label || "Save"}
            preview={preview}
            previewBgClassName={selectedPreviewTab === "links" ? "bg-background" : "bg-gradient-to-tr from-background to-muted"}
            previewToolbarTabs={(
                <Tabs value={selectedPreviewTab} variant="button-sm" onValueChange={onSelectURL}>
                    <TabsList>
                        <TabsTrigger value="signup">Signup</TabsTrigger>
                        <TabsTrigger value="account">Account page</TabsTrigger>
                        <TabsTrigger value="links">Links</TabsTrigger>
                    </TabsList>
                </Tabs>
            )}
            sidebar={sidebar}
            testId="portal-modal"
            title="Portal"
            onClose={requestClose}
            onDeviceChange={setPreviewDevice}
            onOk={() => {
                if (!Object.values(errors).filter(Boolean).length) {
                    void handleSave({ force: true });
                }
            }}
        />
    );
}

export function PortalDialog() {
    const { data: settingsData } = useBrowseSettings();
    const { data: siteResponse } = useBrowseSite();
    const { data: configData } = useBrowseConfig();

    if (!settingsData || !siteResponse || !configData) {
        return null;
    }

    return <PortalDialogContent settings={settingsData.settings} />;
}
