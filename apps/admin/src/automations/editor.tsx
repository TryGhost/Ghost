import { HostLimitError } from '@tryghost/admin-x-framework/errors';
import { useBrowseConfig, upgradeRoute } from '@tryghost/admin-x-framework/api/config';
import { LimitModalContent } from '@/settings/api';
import NewAutomation from './new-automation';
import AutomationStatusDialog from './components/automation-status-dialog';
import { TRIGGER_CANVAS_ID } from './components/canvas/nodes';
import AutomationCanvas, { EMAIL_STEP_QUERY_PARAM } from './components/canvas/automation-canvas';
import AutomationHeader, { type AutomationValidationAction } from './components/automation-header';
import { useLimiter } from '@tryghost/admin-x-framework/hooks';
import { useAutomationForEditing } from './hooks/use-automation-for-editing';
import React from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  type ButtonProps,
  LoadingIndicator,
} from '@tryghost/shade/components';
import { DirtyConfirmDialog, useDirtyConfirmation } from '@tryghost/shade/patterns';
import {
  removeAction,
  useAddAutomation,
  useEditAutomation,
} from '@tryghost/admin-x-framework/api/automations';
import type {
  AutomationDetail,
  AutomationStatus,
} from '@tryghost/admin-x-framework/api/automations';
import { dequal } from 'dequal';
import { isEmptyEmailLexical } from './utils';
import { toast } from 'sonner';
import { useNavigate, useParams } from '@tryghost/admin-x-framework';
import { navigateTo } from '@/utils/navigation';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import type { AutomationEditState } from './types';
import { isAutomationStatusActive } from './utils/is-automation-status-active';
import { ScreenEntranceProvider } from '@/layout/screen-entrance-provider';
import ChangesBar from './concepts/changes-bar';
import ConceptSwitcher from './concepts/concept-switcher';
import { countChanges, pendingChangesKind, withChangeCount } from './concepts/pending-changes';
import {
  isCanvasCard,
  isCanvasCardV2,
  isConceptA,
  isConceptF,
  useConcept,
} from './concepts/concept';

const AUTOMATION_LIMITS = ['limitAutomations'] as const;

const SUBJECT_REQUIRED_MESSAGE = 'Add a subject line.';
const BODY_REQUIRED_MESSAGE = 'Add an email body.';
const SUBJECT_AND_BODY_REQUIRED_MESSAGE = 'Add a subject line and email body.';

const editableSlice = (automation: AutomationDetail) => ({
  name: automation.name,
  description: automation.description,
  status: automation.status,
  trigger_tier_scope: automation.trigger_tier_scope,
  trigger_tier_ids: automation.trigger_tier_ids ? [...automation.trigger_tier_ids].sort() : null,
  actions: automation.actions,
  edges: automation.edges,
});

const getTriggerErrors = (automation: AutomationDetail): Record<string, string> =>
  automation.trigger_tier_scope === 'selected_paid' && !automation.trigger_tier_ids.length
    ? { [TRIGGER_CANVAS_ID]: 'Select at least one paid tier.' }
    : {};

const isFailedEditState = (editState: AutomationEditState): boolean => {
  return editState.phase === 'failed';
};

const getActionErrors = (automation: AutomationDetail): Record<string, string> => {
  const errors: Record<string, string> = {};

  for (const action of automation.actions) {
    if (action.type !== 'send_email') {
      continue;
    }

    const missingSubject = !action.data.email_subject.trim();
    const missingBody = isEmptyEmailLexical(action.data.email_lexical);

    if (missingSubject && missingBody) {
      errors[action.id] = SUBJECT_AND_BODY_REQUIRED_MESSAGE;
    } else if (missingSubject) {
      errors[action.id] = SUBJECT_REQUIRED_MESSAGE;
    } else if (missingBody) {
      errors[action.id] = BODY_REQUIRED_MESSAGE;
    }
  }

  return errors;
};

const AutomationEditorContent: React.FC<{
  automationId: string | null;
  creation?: {
    initialAutomation: AutomationDetail;
    triggerTop?: number;
    onCreated: (id: string) => void;
  };
}> = ({ automationId, creation }) => {
  const navigate = useNavigate();
  const addMutation = useAddAutomation();
  const limiter = useLimiter({ limits: AUTOMATION_LIMITS });
  const { data: configData } = useBrowseConfig();
  const [limitError, setLimitError] = React.useState<HostLimitError | null>(null);
  const { confirm: confirmUpgrade, dialogProps: upgradeDialogProps } = useDirtyConfirmation();
  const { automation, isError: isReadError } = useAutomationForEditing(automationId);

  const editMutation = useEditAutomation();
  const [validationFeedback, setValidationFeedback] =
    React.useState<AutomationValidationAction | null>(null);
  const [editState, setEditState] = React.useState<AutomationEditState>({ phase: 'idle' });
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
  // Invalid text stays in the input, outside the API-ready draft, but must block saving it.
  const [invalidWaitIds, setInvalidWaitIds] = React.useState<Set<string>>(new Set());
  const onWaitValidityChange = React.useCallback((stepId: string, valid: boolean) => {
    setValidationFeedback(null);
    setInvalidWaitIds((current) => {
      if (current.has(stepId) === !valid) {
        return current;
      }
      const next = new Set(current);
      if (valid) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);
  const [actionErrors, setActionErrors] = React.useState<Record<string, string>>({});
  const [isEmailModalDirty, setIsEmailModalDirty] = React.useState(false);
  const isEmailModalDirtyRef = React.useRef(false);
  const isBlockedEmailNavigationLeavingEditorRef = React.useRef(false);

  // Keep the saved snapshot separate from the live query result. Later query updates or errors
  // must not redefine the dirty state or overwrite edits made during this editing session.
  const [savedAutomation, setSavedAutomation] = React.useState<AutomationDetail | undefined>(
    undefined,
  );
  const [draft, setDraft] = React.useState<AutomationDetail | undefined>(
    creation?.initialAutomation,
  );
  React.useEffect(() => {
    if (!automation) {
      return;
    }

    setSavedAutomation((currentAutomation) => currentAutomation ?? automation);
    setDraft((currentDraft) => currentDraft ?? automation);
  }, [automation]);
  // NY-1715 concept F: saved steps deleted on the canvas stay in the draft, marked, until the
  // next save or publish removes them — so deleting is reversible until then, and the card
  // stays where it was. `committedDraft` is the automation as saving would send it.
  const [pendingDeleteIds, setPendingDeleteIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const committedDraft = React.useMemo(
    () =>
      draft &&
      [...pendingDeleteIds].reduce(
        (detail, actionId) =>
          detail.actions.some((action) => action.id === actionId)
            ? removeAction({ detail, actionId })
            : detail,
        draft,
      ),
    [draft, pendingDeleteIds],
  );
  const isEditorLoading = !draft && !isReadError;
  const isEditorError = !draft && isReadError;

  // Only compare the fields the user can edit; server-stamped fields like `updated_at` would
  // otherwise flip the dirty flag immediately after every successful publish.
  const isNew = !!draft && !draft.id;
  const hasUnsavedChanges =
    isNew ||
    invalidWaitIds.size > 0 ||
    (!!committedDraft &&
      !!savedAutomation &&
      !dequal(editableSlice(committedDraft), editableSlice(savedAutomation)));
  const concept = useConcept();
  // C settles changes from a floating bar instead (see ChangesBar), so it skips the indicator.
  const hasChangesBar = concept === 'a2';
  // C puts the count of changes in its Publish changes button (live automations, where
  // publishing reaches members) instead of a separate "Unpublished changes" line.
  const countsChanges = isCanvasCard(concept);
  const changeCount =
    countsChanges && committedDraft && savedAutomation
      ? countChanges(savedAutomation, committedDraft)
      : 0;
  const headerPendingChanges =
    isConceptA(concept) && !hasChangesBar && !countsChanges && hasUnsavedChanges && draft
      ? pendingChangesKind(draft.status)
      : null;

  const onDraftChange = (next: AutomationDetail) => {
    setValidationFeedback(null);
    setDraft(next);
    setInvalidWaitIds((current) => {
      const remaining = new Set(
        [...current].filter((id) => next.actions.some((action) => action.id === id)),
      );
      return remaining.size === current.size ? current : remaining;
    });
    setActionErrors((oldErrors) => {
      if (Object.keys(oldErrors).length === 0) {
        return oldErrors;
      }

      const nextErrors = { ...getActionErrors(next), ...getTriggerErrors(next) };
      return Object.fromEntries(
        Object.entries(oldErrors).filter(([actionId]) => nextErrors[actionId]),
      );
    });
    setEditState((prev) => (isFailedEditState(prev) ? { phase: 'idle' } : prev));
  };

  // NY-1715 concepts D, E and F: Discard goes straight back to the last save, with a plain
  // toast — no Undo, a pattern Ghost doesn't use elsewhere. Each swap restarts an open email
  // editor from the automation's content, as Koenig keeps its own copy once mounted.
  const [emailEditorResetKey, setEmailEditorResetKey] = React.useState(0);
  const isConceptE = isCanvasCardV2(concept) && !isConceptF(concept);
  const discardChanges = () => {
    if (!draft || !savedAutomation) {
      return;
    }
    onDraftChange(savedAutomation);
    setPendingDeleteIds(new Set());
    setEmailEditorResetKey((key) => key + 1);
    // E is trying "undo" wording for discards; the other concepts keep "discard".
    toast('Changes discarded');
  };
  // With no Undo, Discard all asks first, in the same dialog as the email editor's discard.
  const [isConfirmDiscardAllOpen, setIsConfirmDiscardAllOpen] = React.useState(false);
  const requestDiscardChanges = () => setIsConfirmDiscardAllOpen(true);

  // NY-1715 concepts E and F: one step back to the last save — E from its menu's Discard
  // changes, F from its marker's Revert. Only that step's settings change; the rest of the
  // automation stays as it is.
  const setStepData = (stepId: string, from: AutomationDetail) => {
    const source = from.actions.find((action) => action.id === stepId);
    if (!draft || !source) {
      return;
    }
    onDraftChange({
      ...draft,
      actions: draft.actions.map((action) =>
        action.id === stepId ? ({ ...action, data: source.data } as typeof action) : action,
      ),
    });
    setEmailEditorResetKey((key) => key + 1);
  };
  const setStepDeleted = (stepId: string, deleted: boolean) => {
    setPendingDeleteIds((current) => {
      const next = new Set(current);
      if (deleted) {
        next.add(stepId);
      } else {
        next.delete(stepId);
      }
      return next;
    });
    if (deleted) {
      // A deleted step no longer blocks saving: drop its errors and any invalid wait text.
      setValidationFeedback(null);
      setInvalidWaitIds((current) => {
        if (!current.has(stepId)) {
          return current;
        }
        const next = new Set(current);
        next.delete(stepId);
        return next;
      });
      setActionErrors(({ [stepId]: _removed, ...rest }) => rest);
    }
  };
  const revertStep = (stepId: string) => {
    if (!draft || !savedAutomation) {
      return;
    }
    const isEmail = draft.actions.find((action) => action.id === stepId)?.type === 'send_email';
    // Reverting a deleted step brings it back, edits and all; a second Revert undoes those.
    // No toast: the card coming back says it.
    if (pendingDeleteIds.has(stepId)) {
      setStepDeleted(stepId, false);
      return;
    }
    setStepData(stepId, savedAutomation);
    // E's menu says "Discard changes", so its toast matches Discard all; F keeps its Revert words.
    const revertedMessage = isConceptF(concept)
      ? isEmail
        ? 'Email reverted'
        : 'Wait reverted'
      : 'Changes discarded';
    toast(revertedMessage);
  };

  // NY-1715 concepts: switching concepts starts each one fresh for demos — unsaved edits,
  // errors and pending dialogs are dropped (anything already saved stays saved), and the
  // canvas remounts below (keyed on the concept).
  const conceptRef = React.useRef(concept);
  React.useEffect(() => {
    if (conceptRef.current === concept) {
      return;
    }
    conceptRef.current = concept;
    if (savedAutomation) {
      setDraft(savedAutomation);
    }
    setPendingDeleteIds(new Set());
    setInvalidWaitIds(new Set());
    setActionErrors({});
    setValidationFeedback(null);
    setEditState({ phase: 'idle' });
  }, [concept, savedAutomation]);

  const validateForAction = (
    automationToValidate: AutomationDetail,
    action: AutomationValidationAction,
  ): boolean => {
    setValidationFeedback(null);
    if (!automationToValidate.name.trim()) {
      toast.error('Add an automation name.');
      return false;
    }
    const nextActionErrors = {
      ...(action === 'publish' ? getActionErrors(automationToValidate) : {}),
      ...getTriggerErrors(automationToValidate),
    };
    if (Object.keys(nextActionErrors).length > 0 || invalidWaitIds.size > 0) {
      setActionErrors(nextActionErrors);
      setEditState({ phase: 'idle' });
      setValidationFeedback(action);
      return false;
    }

    return true;
  };

  const save = async (statusToSave?: AutomationStatus) => {
    if (!draft) {
      throw new Error('Cannot edit an automation that has not loaded.');
    }

    let validationAction: AutomationValidationAction;
    let requestState: AutomationEditState;
    let errorState: AutomationEditState;

    const oldStatus = draft.status;
    const newStatus = statusToSave ?? oldStatus;
    const statusTransition: `${boolean} -> ${boolean}` = `${isAutomationStatusActive(oldStatus)} -> ${isAutomationStatusActive(newStatus)}`;
    switch (statusTransition) {
      case 'true -> true':
        validationAction = 'publish';
        requestState = { phase: 'submitting', action: 'republish' };
        errorState = { phase: 'failed', action: 'republish' };
        break;
      case 'false -> false':
        validationAction = 'save';
        requestState = { phase: 'submitting', action: 'save' };
        errorState = { phase: 'failed', action: 'save' };
        break;
      case 'false -> true':
        validationAction = 'publish';
        requestState = { phase: 'submitting', action: 'publish' };
        errorState = { phase: 'failed', action: 'publish' };
        break;
      case 'true -> false':
        validationAction = 'unpublish';
        requestState = { phase: 'submitting', action: 'unpublish' };
        errorState = { phase: 'failed', action: 'unpublish' };
        break;
      default: {
        const _exhaustive: never = statusTransition;
        throw new Error(`Unhandled status transition: ${String(_exhaustive)}`);
      }
    }

    if (!committedDraft || !validateForAction(committedDraft, validationAction)) {
      return;
    }

    const handleSaveError = (error: unknown) => {
      if (error instanceof HostLimitError) {
        setEditState({ phase: 'idle' });
        setLimitError(error);
        return;
      }
      setEditState(errorState);
      toast.error('Automation couldn’t be saved');
    };

    setEditState(requestState);

    // An existing active automation consumes its slot already. New active automations
    // and inactive-to-active edits need a fresh count before sending the mutation.
    if (
      newStatus === 'active' &&
      (isNew || savedAutomation?.status !== 'active') &&
      limiter.isLimited('limitAutomations')
    ) {
      try {
        await limiter.errorIfWouldGoOverLimit('limitAutomations');
      } catch (error) {
        handleSaveError(error);
        return;
      }
    }

    const mutation = isNew ? addMutation : editMutation;
    mutation.mutate(
      { ...committedDraft, status: newStatus },
      {
        onSuccess: (response) => {
          const savedDraft = response.automations[0];
          setSavedAutomation(savedDraft);
          setDraft(savedDraft);
          setPendingDeleteIds(new Set());
          setActionErrors({});
          setEditState({ phase: 'idle' });
          if (isNew) {
            creation?.onCreated(savedDraft.id);
            bypassNextNavigation();
            navigate(`/automations/${savedDraft.id}`, { replace: true });
          }
        },
        // Another publisher can take the final slot after the frontend check.
        onError: handleSaveError,
      },
    );
  };

  const isConfirmPublishAlertOpen = editState.action === 'publish';
  const isConfirmUnpublishAlertOpen = editState.action === 'unpublish';
  const isConfirmRepublishAlertOpen = editState.action === 'republish';
  const isEditRequestActive = editState.phase === 'submitting';
  let isSaveButtonEnabled = !!draft && !isAutomationStatusActive(draft.status) && hasUnsavedChanges;
  let saveButtonVariant: ButtonProps['variant'] = 'outline';
  // NY-1715 concepts E and F: Save names its count too, like Publish changes on a live automation.
  let saveButtonChildren: React.ReactNode =
    (isCanvasCardV2(concept) && withChangeCount('Save', changeCount)) || 'Save';
  let isPublishButtonEnabled =
    !!committedDraft &&
    committedDraft.actions.length > 0 &&
    (!isAutomationStatusActive(committedDraft.status) || hasUnsavedChanges);
  const publishButtonVariant: ButtonProps['variant'] = 'default';
  const publishButtonChildren: React.ReactNode =
    draft?.status === 'active'
      ? hasUnsavedChanges
        ? (withChangeCount('Publish', changeCount) ?? 'Publish changes')
        : 'Published'
      : 'Publish';
  let isTurnOffButtonEnabled = true;
  let isRepublishButtonEnabled = true;
  let republishButtonVariant: ButtonProps['variant'] = 'default';
  let republishButtonChildren: React.ReactNode = 'Publish changes';
  switch (editState.phase) {
    case 'idle':
      break;
    case 'submitting':
      isSaveButtonEnabled = false;
      isPublishButtonEnabled = false;
      isTurnOffButtonEnabled = false;

      switch (editState.action) {
        case 'save':
          saveButtonChildren = (
            <>
              <LoadingIndicator size="sm" />
              <span className="sr-only">Saving...</span>
            </>
          );
          break;
        case 'publish':
          break;
        case 'republish':
          isRepublishButtonEnabled = false;
          republishButtonChildren = (
            <>
              <LoadingIndicator color="light" size="sm" />
              <span className="sr-only">Publishing...</span>
            </>
          );
          break;
        case 'unpublish':
          break;
      }
      break;
    case 'confirming':
      switch (editState.action) {
        case 'publish':
          isSaveButtonEnabled = false;
          isPublishButtonEnabled = false;
          break;
        case 'republish':
          isPublishButtonEnabled = false;
          isTurnOffButtonEnabled = false;
          break;
        case 'unpublish':
          isSaveButtonEnabled = false;
          isPublishButtonEnabled = false;
          isTurnOffButtonEnabled = false;
          break;
      }
      break;
    case 'failed':
      switch (editState.action) {
        case 'save':
          saveButtonVariant = 'destructive';
          saveButtonChildren = 'Retry';
          break;
        case 'publish':
          isSaveButtonEnabled = false;
          isPublishButtonEnabled = false;
          break;
        case 'republish':
          isPublishButtonEnabled = false;
          isTurnOffButtonEnabled = false;
          republishButtonVariant = 'destructive';
          republishButtonChildren = 'Retry';
          break;
        case 'unpublish':
          isTurnOffButtonEnabled = true;
          break;
      }
      break;
    default: {
      const _exhaustive: never = editState;
      throw new Error(`Unhandled edit state: ${String(_exhaustive)}`);
    }
  }

  const onConfirmUnpublishOpenChange = (open: boolean): void => {
    setEditState((oldEditState) => {
      switch (oldEditState.phase) {
        case 'confirming':
        case 'failed':
          return oldEditState.action === 'unpublish' && !open ? { phase: 'idle' } : oldEditState;
        case 'idle':
          return open ? { phase: 'confirming', action: 'unpublish' } : oldEditState;
        default:
          return oldEditState;
      }
    });
  };

  const onConfirmPublishOpenChange = (open: boolean): void => {
    setEditState((oldEditState) => {
      switch (oldEditState.phase) {
        case 'confirming':
        case 'failed':
          return oldEditState.action === 'publish' && !open ? { phase: 'idle' } : oldEditState;
        case 'idle':
          return open ? { phase: 'confirming', action: 'publish' } : oldEditState;
        default:
          return oldEditState;
      }
    });
  };

  const onConfirmRepublishOpenChange = (open: boolean): void => {
    setEditState((oldEditState) => {
      switch (oldEditState.phase) {
        case 'confirming':
        case 'failed':
          return oldEditState.action === 'republish' && !open ? { phase: 'idle' } : oldEditState;
        case 'idle':
          return open ? { phase: 'confirming', action: 'republish' } : oldEditState;
        default:
          return oldEditState;
      }
    });
  };

  const onPublish = (): void => {
    if (!draft) {
      throw new Error('Cannot publish an automation that has not loaded.');
    }

    if (!committedDraft || !validateForAction(committedDraft, 'publish')) {
      return;
    }

    switch (draft.status) {
      case 'active':
        setEditState({ phase: 'confirming', action: 'republish' });
        break;
      case 'inactive':
      case 'archived':
        setEditState({ phase: 'confirming', action: 'publish' });
        break;
      default: {
        const _exhaustive: never = draft.status;
        throw new Error(`Unhandled status: ${String(_exhaustive)}`);
      }
    }
  };

  // The dirty email modal claims navigations that change its `emailStep`
  // query param (closing the modal, back button, leaving the editor) so the
  // canvas can run its own discard flow instead of the page-level dialog.
  const {
    dialogProps: discardDialogProps,
    interceptedNavigation,
    bypassNextNavigation,
  } = useUnsavedChangesGuard({
    when: hasUnsavedChanges || isEmailModalDirty,
    confirmUnloadWhen: isEditRequestActive || hasUnsavedChanges || isEmailModalDirty,
    interceptNavigation: ({ currentLocation, nextLocation }) => {
      const currentEmailStep = new URLSearchParams(currentLocation.search).get(
        EMAIL_STEP_QUERY_PARAM,
      );
      const nextEmailStep = new URLSearchParams(nextLocation.search).get(EMAIL_STEP_QUERY_PARAM);
      if (isEmailModalDirtyRef.current && currentEmailStep && currentEmailStep !== nextEmailStep) {
        isBlockedEmailNavigationLeavingEditorRef.current =
          currentLocation.pathname !== nextLocation.pathname;
        return true;
      }

      isBlockedEmailNavigationLeavingEditorRef.current = false;
      return false;
    },
  });
  const isEmailNavigationBlocked = interceptedNavigation.isBlocked;

  const onEmailDirtyChange = React.useCallback((dirty: boolean) => {
    isEmailModalDirtyRef.current = dirty;
    setIsEmailModalDirty(dirty);
  }, []);

  // NY-1715 concept C: shown on the canvas, and below the email editor while it's open.
  const changesBar =
    hasChangesBar && hasUnsavedChanges && draft && !selectedRunId ? (
      <ChangesBar
        commitLabel={
          isAutomationStatusActive(draft.status) ? 'Publish changes' : saveButtonChildren
        }
        isCommitEnabled={
          isAutomationStatusActive(draft.status) ? isPublishButtonEnabled : isSaveButtonEnabled
        }
        kind={pendingChangesKind(draft.status)}
        onCommit={isAutomationStatusActive(draft.status) ? onPublish : () => void save()}
        onDiscard={savedAutomation ? requestDiscardChanges : undefined}
      />
    ) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      data-sentry-mask="true"
      data-testid="automation-editor"
    >
      <AutomationHeader
        automation={draft}
        isLoadingAutomation={isEditorLoading}
        isPublishButtonEnabled={isPublishButtonEnabled && !selectedRunId}
        isSaveButtonEnabled={isSaveButtonEnabled && !selectedRunId}
        isTurnOffButtonEnabled={isTurnOffButtonEnabled && !selectedRunId}
        pendingChanges={headerPendingChanges}
        publishButtonChildren={publishButtonChildren}
        publishButtonVariant={publishButtonVariant}
        publishOnly={hasChangesBar}
        // E and F: a live automation's Publish changes carries Discard; E's Save does too.
        {...(isCanvasCardV2(concept) &&
        hasUnsavedChanges &&
        savedAutomation &&
        (draft?.status === 'active' || !isConceptF(concept))
          ? {
              onDiscard: requestDiscardChanges,
            }
          : {})}
        discardInOverflow={isConceptE}
        neutralDiscard={isCanvasCardV2(concept) && !isConceptF(concept)}
        plainStatus={isConceptE}
        saveButtonChildren={saveButtonChildren}
        saveButtonVariant={saveButtonVariant}
        saveSplit={isCanvasCardV2(concept) && !isConceptF(concept)}
        validationFeedback={selectedRunId ? null : validationFeedback}
        onDismissValidationFeedback={() => setValidationFeedback(null)}
        onNameChange={
          !selectedRunId && draft ? (name) => onDraftChange({ ...draft, name }) : undefined
        }
        onPublish={onPublish}
        onSave={() => void save()}
        onTurnOff={() => {
          if (committedDraft && !validateForAction(committedDraft, 'unpublish')) {
            return;
          }
          setValidationFeedback(null);
          setEditState({ phase: 'confirming', action: 'unpublish' });
        }}
      />

      <AutomationCanvas
        key={concept}
        actionErrors={actionErrors}
        automation={draft}
        emailEditorFooter={changesBar}
        emailEditorPendingChanges={headerPendingChanges}
        emailEditorResetKey={emailEditorResetKey}
        initialSidebar={
          creation
            ? 'closed'
            : !draft || !configData
              ? 'unknown'
              : draft.status === 'active' && configData.config.stats
                ? 'performance'
                : 'closed'
        }
        initialTriggerTop={creation?.triggerTop}
        isEmailNavigationBlocked={isEmailNavigationBlocked}
        isError={isEditorError}
        isLoading={isEditorLoading}
        pendingDeleteIds={pendingDeleteIds}
        savedActions={savedAutomation?.actions}
        savedTriggerTierIds={savedAutomation?.trigger_tier_ids ?? []}
        selectedRunId={selectedRunId}
        onChange={onDraftChange}
        onDeleteSavedStep={
          isCanvasCardV2(concept) && savedAutomation
            ? (stepId) => setStepDeleted(stepId, true)
            : undefined
        }
        onDiscardBlockedEmailNavigation={(closeEmailModal) => {
          onEmailDirtyChange(false);
          if (isBlockedEmailNavigationLeavingEditorRef.current) {
            isBlockedEmailNavigationLeavingEditorRef.current = false;
            interceptedNavigation.reset();
            closeEmailModal();
            return;
          }

          isBlockedEmailNavigationLeavingEditorRef.current = false;
          interceptedNavigation.proceed();
        }}
        onEmailDirtyChange={onEmailDirtyChange}
        onKeepEditingAfterBlockedEmailNavigation={() => {
          isBlockedEmailNavigationLeavingEditorRef.current = false;
          interceptedNavigation.reset();
        }}
        onRevertStep={isCanvasCardV2(concept) && savedAutomation ? revertStep : undefined}
        onSelectRun={setSelectedRunId}
        onWaitValidityChange={onWaitValidityChange}
      />

      <DirtyConfirmDialog {...discardDialogProps} />
      <DirtyConfirmDialog {...upgradeDialogProps} />
      {changesBar}
      <ConceptSwitcher />

      {limitError && (
        <LimitModalContent
          prompt={
            limitError.data?.errors[0]?.context ||
            limitError.data?.errors[0]?.message ||
            limitError.message
          }
          onOk={() => {
            setLimitError(null);
            confirmUpgrade(hasUnsavedChanges || isEmailModalDirty, () => {
              navigateTo(upgradeRoute(configData?.config));
            });
          }}
          onRemove={() => setLimitError(null)}
        />
      )}
      <AutomationStatusDialog
        isError={editState.phase === 'failed'}
        isPending={isEditRequestActive}
        open={isConfirmPublishAlertOpen || isConfirmUnpublishAlertOpen}
        status={isConfirmUnpublishAlertOpen ? 'inactive' : 'active'}
        onConfirm={() => void save(isConfirmUnpublishAlertOpen ? 'inactive' : 'active')}
        onOpenChange={
          isConfirmUnpublishAlertOpen ? onConfirmUnpublishOpenChange : onConfirmPublishOpenChange
        }
      />

      <AlertDialog open={isConfirmDiscardAllOpen} onOpenChange={setIsConfirmDiscardAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {draft?.status === 'active'
                ? 'Your changes to this automation haven’t been published.'
                : 'Your changes to this automation haven’t been saved.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                setIsConfirmDiscardAllOpen(false);
                discardChanges();
              }}
            >
              Discard
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmRepublishAlertOpen} onOpenChange={onConfirmRepublishOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update your automation?</AlertDialogTitle>
            <AlertDialogDescription>
              Once published, your changes apply immediately to members already in progress and to
              any new members who enter the automation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEditRequestActive}>Cancel</AlertDialogCancel>
            <Button
              disabled={!isRepublishButtonEnabled}
              variant={republishButtonVariant}
              onClick={() => void save()}
            >
              {republishButtonChildren}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const AutomationEditor: React.FC = () => {
  const { id: automationId = '' } = useParams<{ id: string }>();

  // Keep the creation session mounted when its first save replaces /new with the server ID.
  const [session, setSession] = React.useState({
    routeId: automationId,
    createdId: null as string | null,
    key: 0,
  });
  if (automationId !== session.routeId) {
    const isFirstSave = session.routeId === 'new' && automationId === session.createdId;
    setSession({
      routeId: automationId,
      createdId: isFirstSave ? session.createdId : null,
      key: isFirstSave ? session.key : session.key + 1,
    });
  }
  return (
    <ScreenEntranceProvider>
      {automationId === 'new' || automationId === session.createdId ? (
        <NewAutomation key={session.key}>
          {(initialAutomation, triggerTop) => (
            <AutomationEditorContent
              automationId={null}
              creation={{
                initialAutomation,
                triggerTop,
                onCreated: (createdId) => setSession((current) => ({ ...current, createdId })),
              }}
            />
          )}
        </NewAutomation>
      ) : (
        <AutomationEditorContent key={automationId} automationId={automationId} />
      )}
    </ScreenEntranceProvider>
  );
};

export default AutomationEditor;
