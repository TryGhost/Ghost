import EmailEditor from './email-editor';
import EmailPreviewFrame from './preview-frame';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import TestEmailDropdown from './test-email-dropdown';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Popover,
  PopoverTrigger,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { getEmailValidationErrors } from './validation';
import { useBrowseAutomatedEmails } from '@tryghost/admin-x-framework/api/automated-emails';
import { useEmailPreview } from './use-email-preview';
import { useEmailSenderDetails } from './use-sender-details';
import { useExpandFromCard } from './use-expand-from-card';
import { usePreviewAutomationEmail } from '@tryghost/admin-x-framework/api/automations';
import type { EmailModalMode } from '@/automations/components/types';

interface EmailPreviewModalContentProps {
  title: React.ReactNode;
  headerActions?: React.ReactNode;
  headerBelow?: React.ReactNode;
  children: React.ReactNode;
  isEditMode?: boolean;
}

// The panel doesn't clip, so Koenig's + button can sit outside its left edge.
const EmailPreviewModalContent = React.forwardRef<HTMLDivElement, EmailPreviewModalContentProps>(
  ({ title, headerActions, headerBelow, children, isEditMode = false }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative mx-auto flex size-full min-h-0 max-w-[664px] flex-col gap-0 rounded-xl border border-border-default p-0 shadow-sm',
        isEditMode ? 'bg-surface-elevated' : 'bg-muted',
      )}
    >
      <div className="sticky top-0 grid shrink-0 grid-cols-[1fr_auto] items-center rounded-t-xl bg-surface-elevated p-8">
        <h3 className="min-w-0 pr-4 text-md font-medium">{title}</h3>
        <div className="flex items-center gap-2">{headerActions}</div>
        {headerBelow && <div className="col-span-2 mt-6">{headerBelow}</div>}
      </div>
      <div className="-ml-[72px] flex min-h-0 grow [scrollbar-gutter:stable] flex-col overflow-y-auto pl-[72px]">
        {children}
      </div>
    </div>
  ),
);
EmailPreviewModalContent.displayName = 'EmailPreviewModalContent';

interface EmailPreviewEmailHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const EmailPreviewEmailHeader: React.FC<EmailPreviewEmailHeaderProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'relative isolate z-20 mx-auto w-full max-w-[600px] rounded-t-lg border border-b-0 border-border-default bg-surface-elevated px-6 py-4 transition-[max-width,padding] duration-300 ease-out motion-reduce:transition-none',
      className,
    )}
  >
    {children}
  </div>
);

interface EmailPreviewBodyProps {
  children: React.ReactNode;
  className?: string;
}

const EmailPreviewBody: React.FC<EmailPreviewBodyProps> = ({ children, className }) => (
  <div
    className={cn(
      'mx-auto flex w-full max-w-[600px] grow rounded-b-lg transition-[max-width,height,padding] duration-300 ease-out motion-reduce:transition-none',
      className,
    )}
  >
    {children}
  </div>
);

const HeaderTooltip: React.FC<{ label: string; children: React.ReactElement }> = ({
  label,
  children,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

export interface EmailContentModalProps {
  automationId: string;
  initialLexical: string;
  initialMode?: EmailModalMode;
  initialSubject: string;
  // The step whose card the editor opens from and closes into.
  originStepId: string;
  onClose: () => void;
  // Called when the close animation starts; onClose runs when it ends.
  onCloseStart?: () => void;
  // Applies edits to the automation draft as they're made. The automation's own
  // Save / Publish changes persists them.
  onChange: (data: { subject: string; lexical: string }) => void;
}

// Koenig popups (link input, emoji picker, card settings) handle Escape
// themselves — the dialog shouldn't also act on it.
const isKoenigPortalFocused = () => {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement && activeElement.closest('[data-kg-portal]') !== null;
};

const EmailContentModal: React.FC<EmailContentModalProps> = ({
  automationId,
  initialMode = 'edit',
  initialSubject,
  initialLexical,
  originStepId,
  onClose,
  onCloseStart,
  onChange,
}) => {
  const { panelRef, close: closeIntoCard } = useExpandFromCard(originStepId);
  const subjectRef = useRef<HTMLInputElement>(null);
  const closeEditor = useCallback(() => {
    onCloseStart?.();
    closeIntoCard(onClose);
  }, [closeIntoCard, onClose, onCloseStart]);
  // initialLexical updates with every edit, so keep the value from open.
  const [lexicalAtOpen] = useState(initialLexical || '');
  const { mutateAsync: previewAutomationEmail } = usePreviewAutomationEmail();
  const { data: automatedEmailsData } = useBrowseAutomatedEmails();
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [mode, setMode] = useState<EmailModalMode>(automationId ? initialMode : 'edit');
  const [formState, setFormState] = useState({
    subject: initialSubject || '',
    lexical: initialLexical || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const hasEnteredInitialPreview = useRef(false);
  const normalizedLexical = useRef<string>(initialLexical || '');
  const hasEditorBeenFocused = useRef(false);
  const editorColumnRef = useRef<HTMLDivElement>(null);
  const automatedEmails = automatedEmailsData?.automated_emails || [];
  const { resolvedSenderName, resolvedSenderEmail, resolvedReplyToEmail, hasDistinctReplyTo } =
    useEmailSenderDetails(automatedEmails);

  const formStateRef = useRef(formState);
  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  // Completeness is only enforced when publishing the automation or sending a test email.
  const validateForTest = useCallback((): boolean => {
    const newErrors = getEmailValidationErrors(formState);
    setErrors(newErrors);
    return Object.values(newErrors).every((error) => !error);
  }, [formState]);
  const { previewFrameState, enterPreview, exitPreview } = useEmailPreview({
    automationId,
    previewAutomationEmail,
    setErrors,
  });

  useEffect(() => {
    if (!automationId || initialMode !== 'preview' || hasEnteredInitialPreview.current) {
      return;
    }
    hasEnteredInitialPreview.current = true;
    void enterPreview(formState);
  }, [automationId, enterPreview, formState, initialMode]);

  const [dialogContentNode, setDialogContentNode] = useState<HTMLDivElement | null>(null);

  // The dialog is non-modal so Radix's focus trap can't fight Koenig's
  // body-level portals (link input, toolbar, emoji picker), which means
  // nothing stops focus from reaching the admin UI behind the editor. Make
  // everything else inert while the editor is open — unfocusable,
  // unclickable, and hidden from screen readers — except the automation
  // header. Koenig portals and stacked dialogs mount after this runs, so
  // they stay interactive.
  useEffect(() => {
    const dialogPortalWrapper = dialogContentNode?.closest('body > *');
    if (!dialogPortalWrapper) {
      return;
    }

    const madeInert: HTMLElement[] = [];
    const editorRoot = document.querySelector<HTMLElement>('[data-testid="automation-editor"]');
    for (const el of document.body.children) {
      if (
        el !== dialogPortalWrapper &&
        el instanceof HTMLElement &&
        !el.inert &&
        !(editorRoot && el.contains(editorRoot))
      ) {
        el.inert = true;
        madeInert.push(el);
      }
    }
    for (const el of editorRoot?.children ?? []) {
      if (el instanceof HTMLElement && el.tagName !== 'HEADER' && !el.inert) {
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

  const handleModeChange = useCallback(
    (nextMode: EmailModalMode) => {
      if (nextMode === 'preview' && !automationId) {
        return;
      }
      setMode(nextMode);

      if (nextMode === 'preview') {
        void enterPreview(formState);
      } else {
        setShowTestDropdown(false);
        exitPreview();
      }
    },
    [automationId, enterPreview, exitPreview, formState],
  );

  // The editor normalizes content on mount (e.g., processing {name} templates),
  // which triggers onChange even without user edits. We track whether the editor
  // has ever been focused - normalization happens before focus is possible, so any
  // onChange before first focus is normalization. After focus, we compare against
  // the normalized baseline to tell an edit from a no-op.
  // An unedited body returns the original lexical, so the draft isn't marked dirty.
  const bodyToApply = useCallback(
    (lexical: string) => (lexical === normalizedLexical.current ? lexicalAtOpen : lexical),
    [lexicalAtOpen],
  );
  const handleEditorChange = useCallback(
    (lexical: string) => {
      setFormState((state) => ({ ...state, lexical }));
      if (!hasEditorBeenFocused.current) {
        normalizedLexical.current = lexical;
        return;
      }
      onChange({ subject: formStateRef.current.subject, lexical: bodyToApply(lexical) });
    },
    [bodyToApply, onChange],
  );

  const subjectField = (
    <div>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>Subject</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          ref={subjectRef}
          aria-describedby={errors.subject ? 'email-subject-error' : undefined}
          aria-invalid={Boolean(errors.subject)}
          aria-label="Subject line"
          data-testid="email-editor-subject"
          value={formState.subject}
          onChange={(e) => {
            const subject = e.target.value;
            setFormState((state) => ({ ...state, subject }));
            setErrors(({ subject: _cleared, ...rest }) => rest);
            onChange({ subject, lexical: bodyToApply(formStateRef.current.lexical) });
          }}
          onKeyDown={(event) => {
            // Tab moves into the body, as from a post's title.
            if (event.key !== 'Tab' || event.shiftKey) {
              return;
            }
            const editable = editorColumnRef.current?.querySelector<HTMLElement>(
              '[contenteditable="true"]',
            );
            if (!editable) {
              return;
            }
            event.preventDefault();
            editable.focus();
            const range = document.createRange();
            range.selectNodeContents(editable);
            range.collapse(true);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
          }}
        />
      </InputGroup>
      {errors.subject && (
        <span className="mt-2 block text-xs text-destructive" id="email-subject-error">
          {errors.subject}
        </span>
      )}
    </div>
  );

  return (
    <Dialog
      modal={false}
      open
      onOpenChange={(next) => {
        if (!next) {
          closeEditor();
        }
      }}
    >
      {/* Starts below the automation header (h-14), which stays usable. */}
      <DialogContent
        ref={setDialogContentNode}
        aria-describedby={undefined}
        className="top-14 left-0 h-[calc(100dvh-3.5rem)] w-full max-w-full translate-0 grid-rows-[1fr] gap-0 rounded-none border-0 bg-transparent p-4 shadow-none outline-hidden data-[state=open]:animate-none sm:rounded-none sm:p-6"
        data-sentry-mask="true"
        onClick={(event) => {
          // A click on the canvas around the panel minimizes the editor.
          if (event.target === event.currentTarget) {
            closeEditor();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (isKoenigPortalFocused()) {
            // prevent Radix dismissing the dialog but let the
            // event through so Koenig can close its popup
            event.preventDefault();
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          closeEditor();
        }}
        onInteractOutside={(event) => {
          // Never auto-dismiss on pointer/focus outside. Without this, a non-modal
          // dialog dismisses when Tab lands focus on anything outside it (e.g. Radix's
          // focus-guard spans, or the automation header).
          event.preventDefault();
        }}
        onOpenAutoFocus={(event) => {
          // Focus the subject, not the first header button, which would open its tooltip.
          event.preventDefault();
          const subject = subjectRef.current;
          subject?.focus({ preventScroll: true });
          subject?.setSelectionRange(subject.value.length, subject.value.length);
        }}
      >
        <DialogTitle className="sr-only">Edit email</DialogTitle>
        <EmailPreviewModalContent
          ref={panelRef}
          headerActions={
            <TooltipProvider delayDuration={150}>
              <ToggleGroup
                aria-label="Editor view"
                data-testid="email-mode-toggle"
                type="single"
                value={mode}
                onValueChange={(value) => value && handleModeChange(value as EmailModalMode)}
              >
                <HeaderTooltip label="Content">
                  {/* The tooltip wraps the item, whose own data-state it would otherwise replace. */}
                  <span className="inline-flex">
                    <ToggleGroupItem
                      aria-label="Content"
                      data-testid="email-mode-edit"
                      value="edit"
                    >
                      <LucideIcon.PenLine className="size-3.5!" />
                    </ToggleGroupItem>
                  </span>
                </HeaderTooltip>
                <HeaderTooltip
                  label={automationId ? 'Preview' : 'Save automation to preview or send a test'}
                >
                  <span className="inline-flex">
                    <ToggleGroupItem
                      aria-label="Preview"
                      data-testid="email-mode-preview"
                      disabled={!automationId}
                      value="preview"
                    >
                      <LucideIcon.Eye className="size-3.5!" />
                    </ToggleGroupItem>
                  </span>
                </HeaderTooltip>
              </ToggleGroup>
              <HeaderTooltip label="Minimize">
                <Button
                  aria-label="Minimize editor"
                  size="icon"
                  variant="ghost"
                  onClick={closeEditor}
                >
                  <LucideIcon.Minimize2 />
                </Button>
              </HeaderTooltip>
            </TooltipProvider>
          }
          headerBelow={mode === 'edit' ? subjectField : undefined}
          isEditMode={mode === 'edit'}
          title={
            <span className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="shrink-0 rounded-md bg-muted p-2.5 text-foreground"
              >
                <LucideIcon.Mail className="size-4" />
              </span>
              <span className="truncate">Edit email</span>
            </span>
          }
        >
          {/* pt-1 fits Koenig's + button, which sits 4px above the first line. */}
          <div
            className={cn(
              'flex grow flex-col items-center',
              mode === 'edit' ? 'px-8 pt-1 pb-8' : 'p-8',
            )}
          >
            {mode === 'preview' && (
              <EmailPreviewEmailHeader className="border-x-0 border-t-0 border-b">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center py-1">
                    <div className="w-20 shrink-0 text-sm font-semibold">From:</div>
                    <div className="min-w-0 grow pr-4 text-sm">
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
                        <TestEmailDropdown
                          automationId={automationId}
                          lexical={formState.lexical}
                          subject={formState.subject}
                          validateForm={validateForTest}
                        />
                      )}
                    </Popover>
                  </div>
                  {hasDistinctReplyTo && (
                    <div className="flex items-center">
                      <div className="w-20 shrink-0 text-sm font-semibold">Reply-to:</div>
                      <div className="grow text-sm text-muted-foreground">
                        {resolvedReplyToEmail}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center">
                    <div className="w-20 shrink-0 text-sm font-semibold">Subject:</div>
                    <div className="grow">
                      <span
                        className={cn(
                          'block truncate text-sm',
                          !formState.subject.trim() && 'text-muted-foreground',
                        )}
                        data-testid="email-preview-subject"
                      >
                        {formState.subject.trim() || 'No subject'}
                      </span>
                      {errors.subject && (
                        <span className="mt-2 block text-xs text-destructive">
                          {errors.subject}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </EmailPreviewEmailHeader>
            )}
            <EmailPreviewBody
              className={cn(
                mode === 'preview' && 'bg-surface-elevated shadow-sm',
                mode === 'edit' && 'rounded-lg',
                mode === 'edit' && errors.lexical && 'border border-destructive',
              )}
            >
              <div
                ref={editorColumnRef}
                className={cn(
                  // Keeps Koenig's + button 24px outside the panel's left edge at every breakpoint.
                  'mx-auto w-full max-w-[600px] [&_[data-kg-plus-button]]:right-[calc(100%+56px)]! [&_[data-kg-plus-button]]:left-auto! [&_[data-kg-plus-button]>button]:bg-surface-elevated',
                  mode === 'preview' && 'hidden',
                )}
                data-testid="email-editor"
                onFocus={() => {
                  hasEditorBeenFocused.current = true;
                }}
              >
                {/* Bottom room so the last line and its + menu can scroll into view. */}
                <EmailEditor
                  className="automation-email-editor pb-[30vh]"
                  placeholder="Begin writing your email..."
                  value={formState.lexical}
                  onChange={handleEditorChange}
                />
              </div>
              {mode === 'preview' && <EmailPreviewFrame previewState={previewFrameState} />}
            </EmailPreviewBody>
            {mode === 'edit' && errors.lexical && (
              <span className="mt-2 block max-w-[740px] text-xs text-destructive">
                {errors.lexical}
              </span>
            )}
          </div>
        </EmailPreviewModalContent>
      </DialogContent>
    </Dialog>
  );
};

export default EmailContentModal;
