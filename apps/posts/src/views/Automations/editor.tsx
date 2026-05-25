import AutomationCanvas from './components/automation-canvas';
import AutomationHeader from './components/automation-header';
import React from 'react';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, type ButtonProps, LoadingIndicator} from '@tryghost/shade/components';
import {AutomationDetail, AutomationStatus, useEditAutomation, useReadAutomation} from '@tryghost/admin-x-framework/api/automations';
import {dequal} from 'dequal';
import {useConfirmUnload, useParams} from '@tryghost/admin-x-framework';
import type {AutomationEditState} from './types';

const editableSlice = (automation: AutomationDetail) => ({
    status: automation.status,
    actions: automation.actions,
    edges: automation.edges
});

const AutomationEditor: React.FC = () => {
    const {id = ''} = useParams<{id: string}>();

    const {data, isLoading: isLoadingAutomation, isError} = useReadAutomation(id, {
        defaultErrorHandler: false
    });
    const automation = data?.automations[0];

    const editMutation = useEditAutomation();
    const [editState, setEditState] = React.useState<AutomationEditState>('idle');

    // Draft is the user-facing, locally mutable copy. The React Query cache stays as server truth;
    // staged edits (adding steps, etc.) live here until the user publishes. Seeded once when the
    // automation first loads, and reset to the response after every successful edit.
    const [draft, setDraft] = React.useState<AutomationDetail | undefined>(undefined);
    React.useEffect(() => {
        if (automation) {
            setDraft((oldDraft) => {
                return oldDraft?.id === automation.id ? oldDraft : automation;
            });
        }
    }, [automation]);

    // Only compare the fields the user can edit; server-stamped fields like `updated_at` would
    // otherwise flip the dirty flag immediately after every successful publish.
    const hasUnsavedChanges = !!draft
        && !!automation
        && !dequal(editableSlice(draft), editableSlice(automation));

    const onDraftChange = (next: AutomationDetail) => {
        setDraft(next);
        setEditState((prev) => {
            if (prev === 'failed to save' || prev === 'failed to publish' || prev === 'failed to unpublish') {
                return 'idle';
            }
            return prev;
        });
    };

    const save = (statusToSave?: AutomationStatus) => {
        if (!draft) {
            throw new Error('Cannot edit an automation that has not loaded.');
        }

        let errorState: AutomationEditState;
        switch (statusToSave) {
        case undefined:
            setEditState('saving');
            errorState = 'failed to save';
            break;
        case 'active':
            setEditState('publishing');
            errorState = 'failed to publish';
            break;
        case 'inactive':
            setEditState('unpublishing');
            errorState = 'failed to unpublish';
            break;
        default: {
            const _exhaustive: never = statusToSave;
            throw new Error(`Unhandled status: ${_exhaustive}`);
        }
        }
        editMutation.mutate(
            {
                id: draft.id,
                status: statusToSave ?? draft.status,
                actions: draft.actions,
                edges: draft.edges
            },
            {
                onSuccess: (response) => {
                    setDraft(response.automations[0]);
                    setEditState('idle');
                },
                onError: () => setEditState(errorState)
            }
        );
    };

    let isConfirmUnpublishAlertOpen = false;
    let isEditRequestActive = false;
    let isSaveButtonEnabled = !!draft && draft.actions.length > 0 && draft.status === 'inactive' && hasUnsavedChanges;
    let saveButtonVariant: ButtonProps['variant'] = 'secondary';
    let saveButtonChildren: React.ReactNode = 'Save';
    let isPublishButtonEnabled = !!draft && draft.actions.length > 0 && (draft.status === 'inactive' || hasUnsavedChanges);
    let publishButtonVariant: ButtonProps['variant'] = 'default';
    let publishButtonChildren: React.ReactNode = draft?.status === 'active'
        ? (hasUnsavedChanges ? 'Publish changes' : 'Published')
        : 'Publish';
    let isTurnOffButtonEnabled = true;
    let turnOffButtonChildren: React.ReactNode = 'Turn off';
    switch (editState) {
    case 'idle':
        break;
    case 'saving':
        isEditRequestActive = true;
        isSaveButtonEnabled = false;
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        saveButtonChildren = (
            <>
                <LoadingIndicator size='sm' />
                <span className='sr-only'>Saving...</span>
            </>
        );
        break;
    case 'publishing':
        isEditRequestActive = true;
        isSaveButtonEnabled = false;
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        publishButtonChildren = (
            <>
                <LoadingIndicator color='light' size='sm' />
                <span className='sr-only'>Publishing...</span>
            </>
        );
        break;
    case 'unpublishing':
        isEditRequestActive = true;
        isConfirmUnpublishAlertOpen = true;
        isSaveButtonEnabled = false;
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        turnOffButtonChildren = (
            <>
                <LoadingIndicator color='light' size='sm' />
                <span className='sr-only'>Turning off...</span>
            </>
        );
        break;
    case 'confirming unpublish':
        isConfirmUnpublishAlertOpen = true;
        isSaveButtonEnabled = false;
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        break;
    case 'failed to save':
        saveButtonVariant = 'destructive';
        saveButtonChildren = 'Retry';
        break;
    case 'failed to publish':
        publishButtonVariant = 'destructive';
        publishButtonChildren = 'Retry';
        break;
    case 'failed to unpublish':
        isConfirmUnpublishAlertOpen = true;
        isTurnOffButtonEnabled = true;
        turnOffButtonChildren = 'Retry';
        break;
    default: {
        const _exhaustive: never = editState;
        throw new Error(`Unhandled edit state: ${_exhaustive}`);
    }
    }

    const onConfirmUnpublishOpenChange = (open: boolean): void => {
        setEditState((oldEditState) => {
            switch (oldEditState) {
            case 'idle':
            case 'failed to save':
            case 'failed to publish':
                return open ? 'confirming unpublish' : oldEditState;
            case 'failed to unpublish':
                return open ? 'confirming unpublish' : 'idle';
            case 'saving':
            case 'publishing':
                throw new Error('It should be impossible to hit this state');
            case 'unpublishing':
                return oldEditState;
            case 'confirming unpublish':
                return 'idle';
            default: {
                const _exhaustive: never = oldEditState;
                throw new Error(`Unexpected edit state ${_exhaustive}`);
            }
            }
        });
    };

    useConfirmUnload(isEditRequestActive || hasUnsavedChanges);

    return (
        <div className='fixed inset-0 z-50 flex flex-col bg-background' data-testid='automation-editor'>
            <AutomationHeader
                automation={draft}
                isLoadingAutomation={isLoadingAutomation}
                isPublishButtonEnabled={isPublishButtonEnabled}
                isSaveButtonEnabled={isSaveButtonEnabled}
                isTurnOffButtonEnabled={isTurnOffButtonEnabled}
                publishButtonChildren={publishButtonChildren}
                publishButtonVariant={publishButtonVariant}
                saveButtonChildren={saveButtonChildren}
                saveButtonVariant={saveButtonVariant}
                onPublish={() => save('active')}
                onSave={() => save()}
                onTurnOff={() => setEditState('confirming unpublish')}
            />

            <AutomationCanvas
                automation={draft}
                isError={isError}
                isLoading={isLoadingAutomation}
                onChange={onDraftChange}
            />

            <AlertDialog
                open={isConfirmUnpublishAlertOpen}
                onOpenChange={onConfirmUnpublishOpenChange}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Turn off this automation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            It will stop running until you turn it back on.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isEditRequestActive}>Cancel</AlertDialogCancel>
                        <Button
                            disabled={isEditRequestActive}
                            variant={editState === 'failed to unpublish' ? 'destructive' : 'default'}
                            onClick={() => save('inactive')}
                        >
                            {turnOffButtonChildren}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AutomationEditor;
