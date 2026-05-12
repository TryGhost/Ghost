import AutomationCanvas from './components/automation-canvas';
import AutomationHeader from './components/automation-header';
import React from 'react';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from '@tryghost/shade/components';
import {useEditAutomation, useReadAutomation} from '@tryghost/admin-x-framework/api/automations';
import {useParams} from '@tryghost/admin-x-framework';

type ErrorKind = 'publish' | 'unpublish';

const errorMessageFor = (kind: ErrorKind, error: unknown): string => {
    const detail = error instanceof Error && error.message ? error.message : 'An unexpected error occurred.';
    if (kind === 'publish') {
        return `We couldn't publish this automation. ${detail} Please try again in a moment.`;
    }
    return `We couldn't turn off this automation. ${detail} Please try again in a moment. The automation is still running.`;
};

const AutomationEditor: React.FC = () => {
    const {id = ''} = useParams<{id: string}>();
    const {data, isLoading: isLoadingAutomation, isError} = useReadAutomation(id, {
        defaultErrorHandler: false
    });

    const automation = data?.automations[0];

    const editMutation = useEditAutomation();
    const pendingStatus = editMutation.isLoading && editMutation.variables?.id === automation?.id
        ? editMutation.variables?.status
        : undefined;

    const [isConfirmingUnpublish, setIsConfirmingUnpublish] = React.useState(false);
    const [errorState, setErrorState] = React.useState<{kind: ErrorKind; message: string} | null>(null);

    const runEdit = (kind: ErrorKind, status: 'active' | 'inactive') => {
        if (!automation) {
            throw new Error('Cannot edit an automation that has not loaded.');
        }
        editMutation.mutate(
            {
                id: automation.id,
                status,
                actions: automation.actions,
                edges: automation.edges
            },
            {
                onError: (error) => {
                    setErrorState({kind, message: errorMessageFor(kind, error)});
                }
            }
        );
    };

    const handlePublish = () => {
        runEdit('publish', 'active');
    };

    const handleTurnOffRequested = () => {
        setIsConfirmingUnpublish(true);
    };

    const handleConfirmTurnOff = () => {
        setIsConfirmingUnpublish(false);
        runEdit('unpublish', 'inactive');
    };

    return (
        <div className='flex h-full w-full flex-col' data-testid='automation-editor'>
            <AutomationHeader
                automation={automation}
                isLoadingAutomation={isLoadingAutomation}
                pendingStatus={pendingStatus}
                onPublish={handlePublish}
                onTurnOff={handleTurnOffRequested}
            />
            <AutomationCanvas automation={automation} isError={isError} isLoading={isLoadingAutomation} />

            <AlertDialog open={isConfirmingUnpublish} onOpenChange={setIsConfirmingUnpublish}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Turn off this automation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            It will stop running until you turn it back on.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmTurnOff}>Turn off</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={errorState !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setErrorState(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {errorState?.kind === 'publish' ? 'Couldn’t publish automation' : 'Couldn’t turn off automation'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {errorState?.message}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setErrorState(null)}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AutomationEditor;
