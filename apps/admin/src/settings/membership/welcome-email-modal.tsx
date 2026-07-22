import { useCallback, useEffect, useRef, useState } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    FieldError,
    Input,
    Popover,
    PopoverTrigger,
    Tabs,
    TabsList,
    TabsTrigger,
} from "@tryghost/shade/components";
import { LucideIcon, cn } from "@tryghost/shade/utils";
import { getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseAutomatedEmails, useEditAutomatedEmail, usePreviewWelcomeEmail } from "@tryghost/admin-x-framework/api/automated-emails";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useForm } from "@tryghost/admin-x-framework/hooks";
import type { AutomatedEmail } from "@tryghost/admin-x-framework/api/automated-emails";
import { useWelcomeEmailSenderDetails } from "@/automations/hooks/use-welcome-email-sender-details";

import { WelcomeEmailPreviewFrame } from "./welcome-email-preview-frame";
import { WelcomeEmailTestDropdown } from "./welcome-email-test-dropdown";
import { useWelcomeEmailPreview } from "./use-welcome-email-preview";
import EmailEditor from "@/automations/components/email-modal/email-editor";
import { getEmailValidationErrors } from "@/automations/components/email-modal/validation";
import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The welcome email editor modal, ported from the legacy
 * member-emails/welcome-email-modal.tsx onto the same full-screen non-modal
 * Dialog the automations email editor uses (Koenig portals to body, so the
 * dialog can't be a Radix modal — siblings are made inert instead).
 */

type PreviewMode = "edit" | "preview";

// Koenig popups (link input, emoji picker, card settings) handle Escape
// themselves — the dialog shouldn't also act on it.
const isKoenigPopupFocused = () => {
    const activeElement = document.activeElement;
    return activeElement instanceof HTMLElement &&
        (activeElement.closest("[data-kg-portal]") !== null || activeElement.matches("[data-kg-link-input]") || activeElement.closest("[data-kg-link-input]") !== null);
};

export function WelcomeEmailModal({ emailType = "free", automatedEmail, onClose }: {
    emailType: "free" | "paid";
    automatedEmail: AutomatedEmail;
    onClose: () => void;
}) {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const globalSettings = settingsData?.settings ?? [];
    const config = configData?.config;
    const [siteTitle, defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(globalSettings, ["title", "default_email_address", "support_email_address"]);
    const { confirm } = useConfirmation();
    const { mutateAsync: editAutomatedEmail } = useEditAutomatedEmail();
    const { mutateAsync: previewWelcomeEmail } = usePreviewWelcomeEmail();
    const { data: automatedEmailsData } = useBrowseAutomatedEmails();
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const [mode, setMode] = useState<PreviewMode>("edit");
    const [previewSubjectOverride, setPreviewSubjectOverride] = useState<string | null>(null);
    const normalizedLexical = useRef<string>(automatedEmail?.lexical || "");
    const hasEditorBeenInteractedWith = useRef(false);
    const handleError = useSettingsHandleError();
    const automatedEmails = automatedEmailsData?.automated_emails || [];
    const { resolvedSenderName, resolvedSenderEmail, resolvedReplyToEmail, hasDistinctReplyTo } = useWelcomeEmailSenderDetails(automatedEmails, {
        config: config!,
        defaultEmailAddress,
        siteTitle,
        supportEmailAddress,
    });
    const emailTypeLabel = emailType === "paid" ? "Paid" : "Free";
    const modalTitle = `${emailTypeLabel} members welcome email`;

    const { formState, saveState, updateForm, setFormState, setErrors, handleSave, okProps, errors, validate } = useForm({
        initialState: {
            subject: automatedEmail?.subject || "Welcome",
            lexical: automatedEmail?.lexical || "",
        },
        savingDelay: 500,
        onSave: async (state) => {
            await editAutomatedEmail({ ...automatedEmail, ...state });
        },
        onSaveError: handleError,
        onValidate: getEmailValidationErrors,
    });
    const saveButtonLabel = okProps.label || "Save";
    const { previewFrameState, enterPreview, exitPreview } = useWelcomeEmailPreview({
        automatedEmailId: automatedEmail.id,
        previewWelcomeEmail,
        setErrors,
    });

    const isDirty = saveState === "unsaved";

    const handleClose = useCallback(() => {
        confirmIfDirty(confirm, isDirty, onClose);
    }, [confirm, isDirty, onClose]);

    const handleSaveRef = useRef(handleSave);
    useEffect(() => {
        handleSaveRef.current = handleSave;
    }, [handleSave]);

    useEffect(() => {
        const handleCMDS = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                void handleSaveRef.current({ fakeWhenUnchanged: true });
            }
        };
        window.addEventListener("keydown", handleCMDS);
        return () => {
            window.removeEventListener("keydown", handleCMDS);
        };
    }, []);

    const [dialogContentNode, setDialogContentNode] = useState<HTMLDivElement | null>(null);

    // The dialog is non-modal so Radix's focus trap can't fight Koenig's
    // body-level portals (link input, toolbar, emoji picker). Make everything
    // else at body level inert while the editor is open; Koenig portals and
    // stacked dialogs mount after this runs, so they stay interactive.
    useEffect(() => {
        const dialogPortalWrapper = dialogContentNode?.closest("body > *");
        if (!dialogPortalWrapper) {
            return;
        }

        const madeInert: HTMLElement[] = [];
        for (const el of document.body.children) {
            if (el !== dialogPortalWrapper && el instanceof HTMLElement && !el.inert) {
                el.inert = true;
                madeInert.push(el);
            }
        }

        return () => {
            madeInert.forEach((el) => {
                el.inert = false;
            });
        };
    }, [dialogContentNode]);

    const handleModeChange = useCallback((nextMode: PreviewMode) => {
        setMode(nextMode);

        if (nextMode === "preview") {
            setPreviewSubjectOverride(null);
            void enterPreview(formState);
        } else {
            setShowTestDropdown(false);
            setPreviewSubjectOverride(null);
            exitPreview();
        }
         
    }, [enterPreview, exitPreview, formState]);

    // The editor normalizes content on mount (e.g., processing {name}
    // templates), which triggers onChange even without user edits. Track
    // whether the editor has received user input — the modal can autofocus
    // the editor before normalization finishes, so focus alone is not
    // evidence of an edit. After user interaction, compare against the
    // normalized baseline to determine dirty state.
    const handleEditorChange = useCallback((lexical: string) => {
        if (!hasEditorBeenInteractedWith.current) {
            // Editor hasn't received user input yet = must be normalization
            normalizedLexical.current = lexical;
            setFormState((state) => ({ ...state, lexical }));
            return;
        }

        // Editor has been focused = compare to baseline
        if (lexical !== normalizedLexical.current) {
            updateForm((state) => ({ ...state, lexical }));
        } else {
            // Content reverted to normalized state - don't mark dirty
            setFormState((state) => ({ ...state, lexical }));
        }
    }, [setFormState, updateForm]);

    return (
        <Dialog modal={false} open onOpenChange={(next) => {
            if (!next) {
                handleClose();
            }
        }}>
            <DialogContent
                ref={setDialogContentNode}
                aria-describedby={undefined}
                className="top-0 left-0 flex h-[100dvh] w-full max-w-full translate-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-surface-elevated p-0 shadow-none outline-hidden sm:rounded-none"
                data-testid="welcome-email-modal"
                onEscapeKeyDown={(event) => {
                    if (isKoenigPopupFocused()) {
                        // prevent Radix dismissing the dialog but let the
                        // event through so Koenig can close its popup
                        event.preventDefault();
                        return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    handleClose();
                }}
                onInteractOutside={(event) => {
                    // never auto-dismiss on pointer/focus outside — this is a
                    // full-screen editor whose only exits are the Close button
                    // and Escape
                    event.preventDefault();
                }}
            >
                <div className="sticky top-0 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-background px-5 py-3">
                    <DialogTitle className="justify-self-start text-xl font-semibold">
                        {modalTitle}
                    </DialogTitle>
                    <div className="justify-self-center">
                        <Tabs
                            data-testid="welcome-email-mode-toggle"
                            value={mode}
                            variant="segmented-sm"
                            onValueChange={(value) => value && handleModeChange(value as PreviewMode)}
                        >
                            <TabsList className="grid w-[240px] grid-cols-2">
                                <TabsTrigger className="w-full justify-center" data-testid="welcome-email-mode-edit" value="edit">Email content</TabsTrigger>
                                <TabsTrigger className="w-full justify-center" data-testid="welcome-email-mode-preview" value="preview">Preview</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <div className="flex items-center gap-2 justify-self-end">
                        <Button variant="outline" onClick={handleClose}>Close</Button>
                        <Button
                            disabled={okProps.disabled}
                            onClick={() => void handleSave({ fakeWhenUnchanged: true })}
                        >
                            {saveButtonLabel}
                        </Button>
                    </div>
                </div>
                <div className={cn("flex min-h-0 grow flex-col overflow-y-auto [scrollbar-gutter:stable]", mode === "edit" ? "bg-background" : "bg-muted")}>
                    <div className="flex grow flex-col items-center p-6">
                        {mode === "preview" && (
                            <div className="relative isolate z-20 mx-auto w-full max-w-[780px] rounded-t-lg border-b border-border bg-background px-6 py-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center py-1">
                                        <div className="w-20 shrink-0 font-semibold">From:</div>
                                        <div className="min-w-0 grow pr-4">
                                            <span className="flex gap-1 truncate whitespace-nowrap">
                                                <span>{resolvedSenderName}</span>
                                                <span className="text-muted-foreground">{`<${resolvedSenderEmail}>`}</span>
                                            </span>
                                        </div>
                                        <Popover open={showTestDropdown} onOpenChange={setShowTestDropdown}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline">
                                                    <LucideIcon.Send className="size-4" />
                                                    Test
                                                </Button>
                                            </PopoverTrigger>
                                            {showTestDropdown && (
                                                <WelcomeEmailTestDropdown automatedEmailId={automatedEmail.id} lexical={formState.lexical} subject={formState.subject} validateForm={validate} />
                                            )}
                                        </Popover>
                                    </div>
                                    {hasDistinctReplyTo && (
                                        <div className="flex items-center">
                                            <div className="w-20 shrink-0 font-semibold">Reply-to:</div>
                                            <div className="grow text-muted-foreground">
                                                {resolvedReplyToEmail}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center">
                                        <div className="w-20 shrink-0 font-semibold">Subject:</div>
                                        <div className="grow">
                                            <Input
                                                className="w-full"
                                                data-testid="welcome-email-preview-subject"
                                                value={previewSubjectOverride ?? formState.subject}
                                                onChange={(e) => {
                                                    const nextSubject = e.target.value;
                                                    setPreviewSubjectOverride(nextSubject);
                                                    updateForm((state) => ({ ...state, subject: nextSubject }));
                                                }}
                                            />
                                            {errors.subject && <FieldError className="mt-2">{errors.subject}</FieldError>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className={cn(
                            "mx-auto flex w-full max-w-[780px] grow rounded-b-lg",
                            mode === "preview" && "bg-background shadow-sm",
                            mode === "edit" && "rounded-lg px-6",
                            mode === "edit" && errors.lexical && "border border-destructive",
                        )}>
                            <div
                                className={cn(
                                    "mx-auto w-full max-w-[600px] pt-10 pb-8",
                                    mode === "preview" && "hidden",
                                )}
                                data-testid="welcome-email-editor"
                                onKeyDown={() => {
                                    hasEditorBeenInteractedWith.current = true;
                                }}
                                onPointerDown={() => {
                                    hasEditorBeenInteractedWith.current = true;
                                }}
                            >
                                <EmailEditor
                                    key={automatedEmail?.id || "new"}
                                    className="welcome-email-editor"
                                    placeholder="Begin writing your email..."
                                    value={formState.lexical}
                                    onChange={handleEditorChange}
                                />
                            </div>
                            {mode === "preview" && (
                                <WelcomeEmailPreviewFrame previewState={previewFrameState} />
                            )}
                        </div>
                        {mode === "edit" && errors.lexical && <FieldError className="mt-2 max-w-[740px]">{errors.lexical}</FieldError>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
