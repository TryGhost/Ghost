import { useEffect, useRef, useState } from "react";
import { Button, Switch } from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { APIError } from "@tryghost/admin-x-framework/errors";
import { checkStripeEnabled, getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useAddAutomatedEmail, useBrowseAutomatedEmails, useEditAutomatedEmail, useVerifyAutomatedEmailSender } from "@tryghost/admin-x-framework/api/automated-emails";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useLocation } from "@tryghost/admin-x-framework";
import type { AutomatedEmail } from "@tryghost/admin-x-framework/api/automated-emails";
import { WELCOME_EMAIL_SLUGS, type WelcomeEmailType, getDefaultWelcomeEmailRecord, getDefaultWelcomeEmailValues } from "@/automations/utils/default-welcome-email-values";

import { WelcomeEmailCustomizeDialog } from "./welcome-email-customize-dialog";
import { WelcomeEmailModal } from "./welcome-email-modal";
import { SettingGroup } from "@/settings/app/shared/setting-group";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The Welcome emails group, ported from the legacy membership/member-emails.tsx:
 * free/paid welcome email rows with enable toggles and edit entry points, the
 * Customize dialog, and the sender-verification token flow.
 */

function EmailPreviewRow({ automatedEmail, emailType, icon: Icon, title, enabled, isBusy, isInitialLoading, onEdit, onToggle }: {
    automatedEmail: AutomatedEmail;
    emailType: "free" | "paid";
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    enabled: boolean;
    isBusy: boolean;
    isInitialLoading: boolean;
    onEdit: () => void;
    onToggle: () => void;
}) {
    return (
        <div className="flex w-full items-center gap-3 border-b border-border last:border-b-0" data-testid={`${emailType}-welcome-email-row`}>
            <button
                className="flex w-full min-w-0 items-center gap-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                data-testid={`${emailType}-welcome-email-preview`}
                type="button"
                onClick={onEdit}
            >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 grow">
                    <div className="leading-tight font-medium" data-testid={`${emailType}-welcome-email-title`}>{title}</div>
                    <div className="mt-1 text-sm leading-[1.35] text-muted-foreground">
                        {automatedEmail.subject}
                    </div>
                </div>
            </button>
            <div className={`flex shrink-0 items-center gap-7 ${isBusy && !isInitialLoading ? "pointer-events-none" : ""}`}>
                {isInitialLoading ? (
                    <div className="h-4 w-7 rounded-full bg-muted" />
                ) : (
                    <Switch
                        aria-label={`${title} welcome email`}
                        checked={enabled}
                        disabled={isBusy}
                        onCheckedChange={onToggle}
                    />
                )}
                <button className="font-semibold text-state-success hover:opacity-80" type="button" onClick={onEdit}>
                    Edit
                </button>
            </div>
        </div>
    );
}

export function MemberEmailsGroup({ keywords }: { keywords: string[] }) {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const settings = settingsData?.settings ?? [];
    const config = configData?.config;
    const { confirm } = useConfirmation();
    const [siteTitle] = getSettingValues<string>(settings, ["title"]);
    const { search } = useLocation();
    const verifyEmailToken = new URLSearchParams(search).get("verifyEmail");

    const { data: automatedEmailsData, isLoading } = useBrowseAutomatedEmails();
    const { mutateAsync: addAutomatedEmail, isPending: isAddingAutomatedEmail } = useAddAutomatedEmail();
    const { mutateAsync: editAutomatedEmail, isPending: isEditingAutomatedEmail } = useEditAutomatedEmail();
    const { mutateAsync: verifySenderUpdate } = useVerifyAutomatedEmailSender();
    const handleError = useSettingsHandleError();

    const [editingEmail, setEditingEmail] = useState<{ emailType: WelcomeEmailType; automatedEmail: AutomatedEmail } | null>(null);
    const [customizeOpen, setCustomizeOpen] = useState(false);

    const automatedEmails = automatedEmailsData?.automated_emails || [];
    const isMutating = isAddingAutomatedEmail || isEditingAutomatedEmail;
    const isBusy = isLoading || isMutating;

    const freeWelcomeEmail = automatedEmails.find((email) => email.slug === WELCOME_EMAIL_SLUGS.free);
    const paidWelcomeEmail = automatedEmails.find((email) => email.slug === WELCOME_EMAIL_SLUGS.paid);

    const freeWelcomeEmailEnabled = freeWelcomeEmail?.status === "active";
    const paidWelcomeEmailEnabled = paidWelcomeEmail?.status === "active";

    // Create a new automated email row with the given status
    const createAutomatedEmail = async (emailType: WelcomeEmailType, status: "active" | "inactive") => {
        const defaults = getDefaultWelcomeEmailValues(emailType, siteTitle);
        return addAutomatedEmail({ ...defaults, status });
    };

    const submittedTokenRef = useRef<string | null>(null);

    useEffect(() => {
        if (!verifyEmailToken || !window.location.href.includes("memberemails")) {
            return;
        }

        if (submittedTokenRef.current === verifyEmailToken) {
            return;
        }
        submittedTokenRef.current = verifyEmailToken;

        const clearVerifyEmailFromRoute = () => {
            const hash = window.location.hash.slice(1);
            const url = new URL(hash || "/memberemails", window.location.origin);
            url.searchParams.delete("verifyEmail");

            const nextHash = url.search ? `#${url.pathname}${url.search}` : `#${url.pathname}`;
            window.history.replaceState(null, "", `${window.location.pathname}${nextHash}`);
        };

        const verify = async () => {
            try {
                const { meta: { email_verified: emailVerified } = {} } = await verifySenderUpdate({ token: verifyEmailToken });
                clearVerifyEmailFromRoute();

                let title = "Sender email verified";
                let prompt: React.ReactNode = <>Welcome email sender settings have been updated.</>;

                if (emailVerified === "sender_reply_to") {
                    title = "Reply-to address verified";
                    prompt = <>Welcome email reply-to address has been verified and updated.</>;
                }

                confirm({ title, prompt, okLabel: "Close", cancelLabel: "", onOk: () => {} });
            } catch (e) {
                let prompt = "There was an error verifying your email address. Try again later.";

                if (e instanceof APIError && e.message === "Token expired") {
                    prompt = "Verification link has expired.";
                }

                clearVerifyEmailFromRoute();

                confirm({ title: "Error verifying email address", prompt, okLabel: "Close", cancelLabel: "", onOk: () => {} });
                handleError(e, { withToast: false });
            }
        };

        void verify();
    }, [confirm, handleError, verifyEmailToken, verifySenderUpdate]);

    const handleToggle = async (emailType: "free" | "paid") => {
        const existing = automatedEmails.find((email) => email.slug === WELCOME_EMAIL_SLUGS[emailType]);
        const label = emailType === "free" ? "Free members" : "Paid members";

        if (isBusy) {
            return;
        }

        try {
            if (!existing) {
                await createAutomatedEmail(emailType, "active");
                showToast({ type: "success", title: `${label} welcome email enabled` });
            } else if (existing.status === "active") {
                await editAutomatedEmail({ ...existing, status: "inactive" });
                showToast({ type: "success", title: `${label} welcome email disabled` });
            } else {
                await editAutomatedEmail({ ...existing, status: "active" });
                showToast({ type: "success", title: `${label} welcome email enabled` });
            }
        } catch (e) {
            handleError(e);
        }
    };

    // Handle Edit click - creates inactive row if needed, then opens the modal
    const handleEditClick = async (emailType: "free" | "paid") => {
        const existing = automatedEmails.find((email) => email.slug === WELCOME_EMAIL_SLUGS[emailType]);

        if (isBusy) {
            return;
        }

        if (!existing) {
            try {
                const result = await createAutomatedEmail(emailType, "inactive");
                const newEmail = result?.automated_emails?.[0];
                if (newEmail) {
                    setEditingEmail({ emailType, automatedEmail: newEmail });
                }
            } catch (e) {
                handleError(e);
            }
        } else {
            setEditingEmail({ emailType, automatedEmail: existing });
        }
    };

    // Get email to display (existing or default for preview)
    const freeEmailForDisplay = freeWelcomeEmail || getDefaultWelcomeEmailRecord("free", siteTitle);
    const paidEmailForDisplay = paidWelcomeEmail || getDefaultWelcomeEmailRecord("paid", siteTitle);

    return (
        <SettingGroup
            customButtons={<Button className="mt-[-5px]" size="sm" variant="ghost" onClick={() => setCustomizeOpen(true)}>Customize</Button>}
            description="Create and manage automated emails for your members"
            keywords={keywords}
            navid="memberemails"
            testId="memberemails"
            title="Welcome emails"
        >
            <div className="border-t border-border">
                <EmailPreviewRow
                    automatedEmail={freeEmailForDisplay}
                    emailType="free"
                    enabled={freeWelcomeEmailEnabled}
                    icon={LucideIcon.UserPlus}
                    isBusy={isBusy}
                    isInitialLoading={isLoading}
                    title="Free members welcome email"
                    onEdit={() => void handleEditClick("free")}
                    onToggle={() => void handleToggle("free")}
                />
                {config && checkStripeEnabled(settings, config) && (
                    <EmailPreviewRow
                        automatedEmail={paidEmailForDisplay}
                        emailType="paid"
                        enabled={paidWelcomeEmailEnabled}
                        icon={LucideIcon.Banknote}
                        isBusy={isBusy}
                        isInitialLoading={isLoading}
                        title="Paid members welcome email"
                        onEdit={() => void handleEditClick("paid")}
                        onToggle={() => void handleToggle("paid")}
                    />
                )}
            </div>
            {editingEmail && (
                <WelcomeEmailModal
                    automatedEmail={editingEmail.automatedEmail}
                    emailType={editingEmail.emailType}
                    onClose={() => setEditingEmail(null)}
                />
            )}
            {customizeOpen && (
                <WelcomeEmailCustomizeDialog onClose={() => setCustomizeOpen(false)} />
            )}
        </SettingGroup>
    );
}
