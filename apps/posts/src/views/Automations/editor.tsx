import AutomationCanvas from './components/automation-canvas';
import AutomationHeader from './components/automation-header';
import React from 'react';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, type ButtonProps, LoadingIndicator} from '@tryghost/shade/components';
import {AutomationDetail, AutomationStatus, useEditAutomation, useReadAutomation} from '@tryghost/admin-x-framework/api/automations';
import {dequal} from 'dequal/lite';
import {useParams} from '@tryghost/admin-x-framework';
import type {AutomationEditState} from './types';

const editableSlice = (automation: AutomationDetail) => ({
    status: automation.status,
    actions: automation.actions,
    edges: automation.edges
});

type DerivePublishButtonChildrenArgs = {
    editState: AutomationEditState;
    draftStatus: AutomationStatus | undefined;
    hasUnsavedChanges: boolean;
};

const derivePublishButtonChildren = ({
    editState,
    draftStatus,
    hasUnsavedChanges
}: DerivePublishButtonChildrenArgs): React.ReactNode => {
    switch (editState) {
    case 'publishing':
        return (
            <>
                <LoadingIndicator color='light' size='sm' />
                <span className='sr-only'>Publishing...</span>
            </>
        );
    case 'failed to publish':
        return 'Retry';
    case 'idle':
    case 'unpublishing':
    case 'confirming unpublish':
    case 'failed to unpublish':
        if (draftStatus === 'active') {
            return hasUnsavedChanges ? 'Publish changes' : 'Published';
        }
        // Inactive (or not yet loaded): "Publish" reads better than "Publish changes" because the
        // automation has never been published in its current state.
        return 'Publish';
    default: {
        const _exhaustive: never = editState;
        throw new Error(`Unhandled edit state: ${_exhaustive}`);
    }
    }
};

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
            setDraft(oldDraft => oldDraft || automation);
        }
    }, [automation]);

    // Only compare the fields the user can edit; server-stamped fields like `updated_at` would
    // otherwise flip the dirty flag immediately after every successful publish.
    const hasUnsavedChanges = !!draft
        && !!automation
        && !dequal(editableSlice(draft), editableSlice(automation));

    // A local edit clears the previous failure state — the user is moving forward, so the
    // destructive Retry affordance shouldn't linger.
    const onDraftChange = (next: AutomationDetail) => {
        setDraft(next);
        setEditState((prev) => {
            if (prev === 'failed to publish' || prev === 'failed to unpublish') {
                return 'idle';
            }
            return prev;
        });
    };

    const editStatus = (status: AutomationStatus): void => {
        if (!draft) {
            throw new Error('Cannot edit an automation that has not loaded.');
        }
        let errorState: AutomationEditState;
        switch (status) {
        case 'active':
            setEditState('publishing');
            errorState = 'failed to publish';
            break;
        case 'inactive':
            setEditState('unpublishing');
            errorState = 'failed to unpublish';
            break;
        default: {
            const _exhaustive: never = status;
            throw new Error(`Unhandled status: ${_exhaustive}`);
        }
        }
        editMutation.mutate(
            {
                id: draft.id,
                status,
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
    let isPublishButtonEnabled = draft?.status === 'inactive' || hasUnsavedChanges;
    let publishButtonVariant: ButtonProps['variant'] = 'default';
    let isTurnOffButtonEnabled = true;
    let turnOffButtonChildren: React.ReactNode = 'Turn off';
    switch (editState) {
    case 'publishing':
        isEditRequestActive = true;
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        break;
    case 'unpublishing':
        isEditRequestActive = true;
        isConfirmUnpublishAlertOpen = true;
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
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        break;
    case 'failed to publish':
        publishButtonVariant = 'destructive';
        break;
    case 'failed to unpublish':
        isConfirmUnpublishAlertOpen = true;
        isTurnOffButtonEnabled = true;
        turnOffButtonChildren = 'Retry';
        break;
    }
    const publishButtonChildren = derivePublishButtonChildren({
        editState,
        draftStatus: draft?.status,
        hasUnsavedChanges
    });

    const onConfirmUnpublishOpenChange = (open: boolean): void => {
        setEditState((oldEditState) => {
            switch (oldEditState) {
            case 'idle':
            case 'failed to publish':
                return open ? 'confirming unpublish' : oldEditState;
            case 'failed to unpublish':
                return open ? 'confirming unpublish' : 'idle';
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

    return (
        <div className='flex h-full w-full flex-col' data-testid='automation-editor'>
            <AutomationHeader
                automation={draft}
                isLoadingAutomation={isLoadingAutomation}
                isPublishButtonEnabled={isPublishButtonEnabled}
                isTurnOffButtonEnabled={isTurnOffButtonEnabled}
                publishButtonChildren={publishButtonChildren}
                publishButtonVariant={publishButtonVariant}
                onPublish={() => editStatus('active')}
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
                            onClick={() => editStatus('inactive')}
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
