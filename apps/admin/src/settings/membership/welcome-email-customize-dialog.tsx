import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import validator from "validator";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    Input,
    LoadingIndicator,
    Separator,
    Switch,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Textarea,
} from "@tryghost/shade/components";
import { type AutomatedEmailDesign, type EditAutomatedEmailDesign, useEditAutomatedEmailDesign, useReadAutomatedEmailDesign } from "@tryghost/admin-x-framework/api/automated-email-design";
import { getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useAddAutomatedEmail, useBrowseAutomatedEmails, useEditAutomatedEmailSenders } from "@tryghost/admin-x-framework/api/automated-emails";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useForm } from "@tryghost/admin-x-framework/hooks";
import EmailPreview from "@tryghost/admin-x-settings/src/components/settings/email-design/email-preview";
import HeaderImageField from "@tryghost/admin-x-settings/src/components/settings/email-design/header-image-field";
import ShowBadgeField from "@tryghost/admin-x-settings/src/components/settings/email-design/show-badge-field";
import WelcomeEmailPreviewContent from "@tryghost/admin-x-settings/src/components/settings/email-design/welcome-email-preview-content";
import { EmailDesignProvider } from "@tryghost/admin-x-settings/src/components/settings/email-design/email-design-context";
import {
    BackgroundColorField,
    BodyFontField,
    ButtonColorField,
    ButtonCornersField,
    ButtonStyleField,
    DividerColorField,
    HeaderBackgroundField,
    HeadingFontField,
    HeadingWeightField,
    ImageCornersField,
    LinkColorField,
    LinkStyleField,
    SectionTitleColorField,
} from "@tryghost/admin-x-settings/src/components/settings/email-design/design-fields";
import { DEFAULT_EMAIL_DESIGN } from "@tryghost/admin-x-settings/src/components/settings/email-design/types";
import type { EmailDesignSettings } from "@tryghost/admin-x-settings/src/components/settings/email-design/types";
import { WELCOME_EMAIL_SLUGS, type WelcomeEmailType, getDefaultWelcomeEmailValues } from "@/automations/utils/default-welcome-email-values";
import { useWelcomeEmailSenderDetails } from "@/automations/hooks/use-welcome-email-sender-details";

import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The welcome email customize dialog, ported from the legacy
 * member-emails/welcome-email-customize-modal.tsx: sender + content settings
 * and the shared automated-email design fields beside a live preview. The
 * legacy EmailDesignModal/DirtyConfirmModal chrome is rebuilt natively (the
 * originals mount through NiceModal); the pure design fields and preview are
 * imported from the legacy source, not duplicated.
 */

interface GeneralSettings {
    senderName: string;
    senderEmail: string;
    replyToEmail: string;
    headerImage: string;
    showPublicationIcon: boolean;
    showPublicationTitle: boolean;
    showBadge: boolean;
    emailFooter: string;
}

interface WelcomeEmailCustomizeFormState {
    designSettings: EmailDesignSettings;
    generalSettings: GeneralSettings;
}

const SAVE_ERROR_TOAST_ID = "welcome-email-design-save-error";
const WELCOME_EMAIL_DESIGN_FIELDS = new Set(Object.keys(DEFAULT_EMAIL_DESIGN));

const isWelcomeEmailDesignField = (key: string) => WELCOME_EMAIL_DESIGN_FIELDS.has(key);

interface GeneralTabProps {
    generalSettings: GeneralSettings;
    onGeneralChange: (updates: Partial<GeneralSettings>) => void;
    showPublicationIconToggle: boolean;
    senderNamePlaceholder: string;
    senderEmailPlaceholder: string;
    replyToEmailPlaceholder: string;
    showSenderEmailInput: boolean;
    senderNameError?: string;
    senderEmailError?: string;
    replyToEmailError?: string;
}

function GeneralTab({
    generalSettings,
    onGeneralChange,
    showPublicationIconToggle,
    senderNamePlaceholder,
    senderEmailPlaceholder,
    replyToEmailPlaceholder,
    showSenderEmailInput,
    senderNameError,
    senderEmailError,
    replyToEmailError,
}: GeneralTabProps) {
    return (
        <div className="flex flex-col gap-6 pt-6">
            <section>
                <h4 className="mb-4 font-semibold md:text-lg">Email info</h4>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="font-medium" htmlFor="welcome-email-sender-name">Sender name</label>
                        <Input
                            id="welcome-email-sender-name"
                            placeholder={senderNamePlaceholder}
                            value={generalSettings.senderName}
                            onChange={(e) => onGeneralChange({ senderName: e.target.value })}
                        />
                        {senderNameError ? <p className="text-sm text-destructive">{senderNameError}</p> : null}
                    </div>
                    {showSenderEmailInput ? (
                        <div className="flex flex-col gap-1.5">
                            <label className="font-medium" htmlFor="welcome-email-sender-email">Sender email</label>
                            <Input
                                id="welcome-email-sender-email"
                                placeholder={senderEmailPlaceholder}
                                value={generalSettings.senderEmail}
                                onChange={(e) => onGeneralChange({ senderEmail: e.target.value })}
                            />
                            {senderEmailError ? <p className="text-sm text-destructive">{senderEmailError}</p> : null}
                        </div>
                    ) : null}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-medium" htmlFor="welcome-email-reply-to-email">Reply-to email</label>
                        <Input
                            id="welcome-email-reply-to-email"
                            placeholder={replyToEmailPlaceholder}
                            value={generalSettings.replyToEmail}
                            onChange={(e) => onGeneralChange({ replyToEmail: e.target.value })}
                        />
                        {replyToEmailError ? <p className="text-sm text-destructive">{replyToEmailError}</p> : null}
                    </div>
                </div>
            </section>

            <Separator />

            <section>
                <h4 className="mb-4 font-semibold md:text-lg">Content</h4>
                <div className="flex flex-col gap-4">
                    <HeaderImageField
                        value={generalSettings.headerImage}
                        onChange={(url) => onGeneralChange({ headerImage: url })}
                    />
                    {showPublicationIconToggle && (
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Publication icon</span>
                            <Switch
                                checked={generalSettings.showPublicationIcon}
                                size="sm"
                                onCheckedChange={(checked) => onGeneralChange({ showPublicationIcon: checked })}
                            />
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Publication title</span>
                        <Switch
                            checked={generalSettings.showPublicationTitle}
                            size="sm"
                            onCheckedChange={(checked) => onGeneralChange({ showPublicationTitle: checked })}
                        />
                    </div>
                    <div className="mt-2 flex flex-col gap-1.5">
                        <label className="font-medium" htmlFor="welcome-email-footer">Email footer</label>
                        <Textarea
                            id="welcome-email-footer"
                            placeholder="Any extra information or legal text"
                            rows={3}
                            value={generalSettings.emailFooter}
                            onChange={(e) => onGeneralChange({ emailFooter: e.target.value })}
                        />
                    </div>
                    <ShowBadgeField
                        value={generalSettings.showBadge}
                        onChange={(checked) => onGeneralChange({ showBadge: checked })}
                    />
                </div>
            </section>
        </div>
    );
}

function DesignTab() {
    return (
        <div className="flex flex-col gap-6 pt-6">
            <section>
                <h4 className="mb-4 font-semibold md:text-lg">Global</h4>
                <div className="flex flex-col gap-4">
                    <BackgroundColorField />
                    <HeadingFontField />
                    <HeadingWeightField />
                    <BodyFontField />
                </div>
            </section>

            <Separator />

            <section>
                <h4 className="mb-4 font-semibold md:text-lg">Header</h4>
                <div className="flex flex-col gap-4">
                    <HeaderBackgroundField />
                </div>
            </section>

            <Separator />

            <section>
                <h4 className="mb-4 font-semibold md:text-lg">Body</h4>
                <div className="flex flex-col gap-4">
                    <SectionTitleColorField />
                    <ButtonColorField />
                    <ButtonStyleField />
                    <ButtonCornersField />
                    <LinkColorField />
                    <LinkStyleField />
                    <ImageCornersField />
                    <DividerColorField />
                </div>
            </section>
        </div>
    );
}

/**
 * Maps API response fields to the frontend GeneralSettings shape. Sender
 * fields are not part of the design endpoint, so they carry over from
 * `defaults`.
 */
function mapApiToGeneralSettings(
    apiData: Pick<AutomatedEmailDesign, "header_image" | "show_header_icon" | "show_header_title" | "show_badge" | "footer_content">,
    defaults: GeneralSettings,
): GeneralSettings {
    return {
        senderName: defaults.senderName,
        senderEmail: defaults.senderEmail,
        replyToEmail: defaults.replyToEmail,
        headerImage: apiData.header_image || "",
        showPublicationIcon: apiData.show_header_icon,
        showPublicationTitle: apiData.show_header_title,
        showBadge: apiData.show_badge,
        emailFooter: apiData.footer_content || "",
    };
}

function mapApiToDesignSettings(apiData: EmailDesignSettings): EmailDesignSettings {
    return Object.fromEntries(
        Object.entries(apiData).filter(([key]) => isWelcomeEmailDesignField(key)),
    ) as EmailDesignSettings;
}

function buildAutomatedEmailDesignPayload(state: WelcomeEmailCustomizeFormState): EditAutomatedEmailDesign {
    const persistedDesign = Object.fromEntries(
        Object.entries(state.designSettings).filter(([key]) => isWelcomeEmailDesignField(key)),
    );

    return {
        ...persistedDesign,
        header_image: state.generalSettings.headerImage || null,
        show_header_icon: state.generalSettings.showPublicationIcon,
        show_header_title: state.generalSettings.showPublicationTitle,
        show_badge: state.generalSettings.showBadge,
        footer_content: state.generalSettings.emailFooter || null,
    };
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="flex h-full items-center justify-center px-6 text-center text-muted-foreground">
            {message}
        </div>
    );
}

const normalizeSenderValue = (value: string | null | undefined) => {
    const trimmed = value?.trim() || "";
    return trimmed || null;
};

export function WelcomeEmailCustomizeDialog({ onClose }: { onClose: () => void }) {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const globalSettings = settingsData?.settings ?? [];
    const config = configData?.config;
    const [siteTitle, defaultEmailAddress, icon, supportEmailAddress, accentColorSetting] = getSettingValues<string>(
        globalSettings,
        ["title", "default_email_address", "icon", "support_email_address", "accent_color"],
    );
    const accentColor = accentColorSetting || "#FF1A75";

    const handleError = useSettingsHandleError();
    const { data: designData, isLoading, isError } = useReadAutomatedEmailDesign();
    const { data: automatedEmailsData } = useBrowseAutomatedEmails();
    const { mutateAsync: editDesign } = useEditAutomatedEmailDesign();
    const { mutateAsync: addAutomatedEmail } = useAddAutomatedEmail();
    const { mutateAsync: editAutomatedEmailSenders } = useEditAutomatedEmailSenders();
    const hasAutomations = useFeatureFlag("automations");
    const [hasSaveError, setHasSaveError] = useState(false);
    const [senderInputsHydrated, setSenderInputsHydrated] = useState(false);
    const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
    const automatedEmails = automatedEmailsData?.automated_emails || [];

    const {
        senderNameInput,
        senderEmailInput,
        replyToEmailInput,
        senderNamePlaceholder,
        senderEmailPlaceholder,
        replyToEmailPlaceholder,
        showSenderEmailInput,
        senderEmailDomain,
    } = useWelcomeEmailSenderDetails(automatedEmails, {
        config: config!,
        defaultEmailAddress,
        siteTitle,
        supportEmailAddress,
    });

    const defaultGeneralSettings = useMemo<GeneralSettings>(() => ({
        senderName: senderNameInput,
        senderEmail: senderEmailInput,
        replyToEmail: replyToEmailInput,
        headerImage: "",
        showPublicationIcon: true,
        showPublicationTitle: true,
        showBadge: true,
        emailFooter: "",
    }), [replyToEmailInput, senderEmailInput, senderNameInput]);

    const ensureWelcomeEmailRows = useCallback(async () => {
        const existingBySlug = new Map((automatedEmailsData?.automated_emails || []).map((email) => [email.slug, email]));

        for (const emailType of ["free", "paid"] as WelcomeEmailType[]) {
            if (existingBySlug.has(WELCOME_EMAIL_SLUGS[emailType])) {
                continue;
            }

            const defaults = getDefaultWelcomeEmailValues(emailType, siteTitle);
            const created = await addAutomatedEmail({ ...defaults, status: "inactive" });
            const createdEmail = created.automated_emails?.[0];
            if (createdEmail) {
                existingBySlug.set(createdEmail.slug, createdEmail);
            }
        }
    }, [addAutomatedEmail, automatedEmailsData?.automated_emails, siteTitle]);

    const { formState, saveState, updateForm, setFormState, handleSave, okProps, errors } = useForm<WelcomeEmailCustomizeFormState>({
        initialState: {
            designSettings: { ...DEFAULT_EMAIL_DESIGN },
            generalSettings: defaultGeneralSettings,
        },
        savingDelay: 500,
        onSave: async (state) => {
            if (!design) {
                toast.error("Unable to load email design settings. Please try again.", {
                    id: SAVE_ERROR_TOAST_ID,
                });
                setHasSaveError(true);
                throw new Error("Unable to load email design settings");
            }

            if (!hasAutomations) {
                await ensureWelcomeEmailRows();
            }
            const senderPayload = {
                sender_name: normalizeSenderValue(state.generalSettings.senderName),
                sender_reply_to: normalizeSenderValue(state.generalSettings.replyToEmail),
                ...(showSenderEmailInput ? {
                    sender_email: normalizeSenderValue(state.generalSettings.senderEmail),
                } : {}),
            };

            const { meta: { sent_email_verification: sentEmailVerification = [] } = {} } = await editAutomatedEmailSenders(senderPayload);

            await editDesign(buildAutomatedEmailDesignPayload(state));

            if (sentEmailVerification.length > 0) {
                toast.info("We’ve sent a confirmation email to the new address.");
            }
            setHasSaveError(false);
            toast.dismiss(SAVE_ERROR_TOAST_ID);
        },
        onSaveError: (error) => {
            handleError(error, { withToast: false });
            toast.error("Unable to save email design settings. Please try again.", {
                id: SAVE_ERROR_TOAST_ID,
            });
            setHasSaveError(true);
        },
        onValidate: (state) => {
            const validationErrors: Record<string, string> = {};
            const senderEmail = state.generalSettings.senderEmail?.trim();
            const replyToEmail = state.generalSettings.replyToEmail?.trim();

            if (showSenderEmailInput && senderEmail) {
                if (!validator.isEmail(senderEmail)) {
                    validationErrors.senderEmail = "Enter a valid email address";
                } else if (senderEmailDomain && senderEmail.split("@")[1]?.toLowerCase() !== senderEmailDomain.toLowerCase()) {
                    validationErrors.senderEmail = `Email address must end with @${senderEmailDomain}`;
                }
            }

            if (replyToEmail && !validator.isEmail(replyToEmail)) {
                validationErrors.replyToEmail = "Enter a valid email address";
            }

            return validationErrors;
        },
    });
    const [hydratedDesignVersion, setHydratedDesignVersion] = useState<string | null>(null);
    const design = designData?.automated_email_design?.[0];
    const designVersion = design ? `${design.id}:${design.updated_at ?? "initial"}` : null;
    const { designSettings, generalSettings } = formState;

    // Hydrate local state from API data on initial load only
    useEffect(() => {
        if (design && hydratedDesignVersion === null) {
            setFormState((state) => ({
                designSettings: mapApiToDesignSettings(design),
                generalSettings: mapApiToGeneralSettings(design, state.generalSettings),
            }));
            setHydratedDesignVersion(designVersion);
        }
    }, [design, designVersion, hydratedDesignVersion, setFormState]);

    useEffect(() => {
        if (senderInputsHydrated || automatedEmailsData === undefined) {
            return;
        }

        setFormState((state) => ({
            ...state,
            generalSettings: {
                ...state.generalSettings,
                senderName: senderNameInput,
                senderEmail: senderEmailInput,
                replyToEmail: replyToEmailInput,
            },
        }));
        setSenderInputsHydrated(true);
    }, [automatedEmailsData, replyToEmailInput, senderEmailInput, senderInputsHydrated, senderNameInput, setFormState]);

    const handleDesignChange = useCallback((updates: Partial<EmailDesignSettings>) => {
        setHasSaveError(false);
        toast.dismiss(SAVE_ERROR_TOAST_ID);
        updateForm((state) => ({
            ...state,
            designSettings: { ...state.designSettings, ...updates },
        }));
    }, [updateForm]);

    const handleGeneralChange = useCallback((updates: Partial<GeneralSettings>) => {
        setHasSaveError(false);
        toast.dismiss(SAVE_ERROR_TOAST_ID);
        updateForm((state) => ({
            ...state,
            generalSettings: { ...state.generalSettings, ...updates },
        }));
    }, [updateForm]);

    const dirty = saveState === "unsaved";

    const requestClose = useCallback(() => {
        if (dirty) {
            setConfirmDiscardOpen(true);
        } else {
            onClose();
        }
    }, [dirty, onClose]);

    const handleSaveRef = useRef<() => void>(() => {});
    handleSaveRef.current = () => void handleSave({ fakeWhenUnchanged: true });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                handleSaveRef.current();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const fetchErrorMessage = "Unable to load email design settings. Please try again.";
    const modalOkProps = hasSaveError ? {
        ...okProps,
        color: "red" as const,
        label: "Retry",
    } : okProps;

    const sidebar = (
        <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="general" variant="underline">
            <TabsList className="px-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
            </TabsList>
            {isLoading ? (
                <div className="flex flex-1 items-center justify-center">
                    <LoadingIndicator size="md" />
                </div>
            ) : isError ? (
                <div className="flex flex-1 items-center justify-center px-6 text-center text-muted-foreground">
                    {fetchErrorMessage}
                </div>
            ) : (
                <>
                    <TabsContent className="min-h-0 flex-1 overflow-y-auto px-5 pb-5" value="general">
                        <GeneralTab
                            generalSettings={generalSettings}
                            replyToEmailError={errors.replyToEmail}
                            replyToEmailPlaceholder={replyToEmailPlaceholder}
                            senderEmailError={errors.senderEmail}
                            senderEmailPlaceholder={senderEmailPlaceholder}
                            senderNameError={errors.senderName}
                            senderNamePlaceholder={senderNamePlaceholder}
                            showPublicationIconToggle={Boolean(icon)}
                            showSenderEmailInput={showSenderEmailInput}
                            onGeneralChange={handleGeneralChange}
                        />
                    </TabsContent>
                    <TabsContent className="min-h-0 flex-1 overflow-y-auto px-5 pb-5" value="design">
                        <DesignTab />
                    </TabsContent>
                </>
            )}
        </Tabs>
    );

    return (
        <EmailDesignProvider accentColor={accentColor} settings={designSettings} onSettingsChange={handleDesignChange}>
            <Dialog
                open
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        requestClose();
                    }
                }}
            >
                <DialogContent
                    aria-describedby={undefined}
                    className="top-[50%] left-[50%] h-[calc(100vh-8vmin)] w-[calc(100vw-8vmin)] max-w-none translate-[-50%] gap-0 overflow-hidden p-0"
                    data-testid="welcome-email-customize-modal"
                    onEscapeKeyDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        requestClose();
                    }}
                >
                    <div className="flex h-full min-h-0">
                        <div className="hidden min-h-0 flex-1 flex-col bg-muted [@media(min-width:801px)]:flex">
                            <div className="flex min-h-0 flex-1 items-center justify-center p-8">
                                {isError ? (
                                    <ErrorState message={fetchErrorMessage} />
                                ) : (
                                    <EmailPreview
                                        accentColor={accentColor}
                                        emailFooter={generalSettings.emailFooter}
                                        footerLinkText="Manage your preferences"
                                        headerImage={generalSettings.headerImage}
                                        publicationIcon={icon}
                                        replyToEmail={generalSettings.replyToEmail || replyToEmailPlaceholder || ""}
                                        senderEmail={generalSettings.senderEmail || senderEmailPlaceholder || defaultEmailAddress || ""}
                                        senderName={generalSettings.senderName || senderNamePlaceholder || siteTitle || "Your site"}
                                        settings={designSettings}
                                        showBadge={generalSettings.showBadge}
                                        showPublicationIcon={generalSettings.showPublicationIcon && Boolean(icon)}
                                        showPublicationTitle={generalSettings.showPublicationTitle}
                                        showRecipientLine={false}
                                        showSubjectLine={false}
                                        siteTitle={siteTitle}
                                        subject={`Welcome to ${generalSettings.senderName || senderNamePlaceholder || siteTitle || "our publication"}`}
                                    >
                                        <WelcomeEmailPreviewContent />
                                    </EmailPreview>
                                )}
                            </div>
                        </div>

                        <div className="flex min-h-0 w-full flex-col border-l border-border [@media(min-width:801px)]:w-[400px] [@media(min-width:801px)]:shrink-0">
                            <div className="flex items-center justify-between px-6 py-5">
                                <DialogTitle>Welcome emails</DialogTitle>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" onClick={requestClose}>Close</Button>
                                    <Button
                                        className={modalOkProps.color === "green" ? "bg-state-success text-white hover:bg-state-success/90" : undefined}
                                        disabled={isLoading || isError || modalOkProps.disabled}
                                        variant={modalOkProps.color === "red" ? "destructive" : "default"}
                                        onClick={() => handleSaveRef.current()}
                                    >
                                        {modalOkProps.label || "Save"}
                                    </Button>
                                </div>
                            </div>
                            {sidebar}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <AlertDialog open={confirmDiscardOpen} onOpenChange={(open) => setConfirmDiscardOpen(open)}>
                <AlertDialogContent
                    data-testid="welcome-email-dirty-confirm-modal"
                    onEscapeKeyDown={(event) => {
                        event.stopPropagation();
                    }}
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to leave this page?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>{`Hey there! It looks like you didn't save the changes you made.`}</p>
                                <p>Save before you go!</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDiscardOpen(false)}>Stay</Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setConfirmDiscardOpen(false);
                                onClose();
                            }}
                        >
                            Leave
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </EmailDesignProvider>
    );
}
