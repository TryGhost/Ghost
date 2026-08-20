import {useEffect, useState} from 'react';

import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, Input, Label} from '@tryghost/shade/components';
import {Stack, Text} from '@tryghost/shade/primitives';

import {validateThemeCopyName} from './publish-theme';

import type {PublishResult} from '@/builder/core/workspace';
import type {BuilderSessionStatus} from '@/builder/core/builder-session';
import type {ThemePublishState} from './publish-theme';

function progressLabel(state: ThemePublishState): string | null {
    if (state.status !== 'publishing') {
        return null;
    }
    switch (state.stage) {
    case 'validation':
        return 'Validating theme archive…';
    case 'upload':
        return 'Uploading theme…';
    case 'activation':
        return 'Activating theme copy…';
    case 'settings':
        return 'Saving design settings…';
    default:
        return 'Publishing changes…';
    }
}

export const PublishThemeDialog = ({themeName, builtIn, dirty, installedThemeNames = [], sessionStatus, publishState, onPublish}: {
    themeName: string;
    builtIn: boolean;
    dirty: boolean;
    installedThemeNames?: readonly string[];
    sessionStatus: BuilderSessionStatus;
    publishState: ThemePublishState;
    onPublish: (copyName?: string) => Promise<PublishResult>;
}) => {
    const [open, setOpen] = useState(false);
    const [copyName, setCopyName] = useState(`${themeName}-edited`);
    const [nameError, setNameError] = useState<string>();
    const [publishError, setPublishError] = useState<string>();
    const isPublishing = sessionStatus === 'publishing' || publishState.status === 'publishing';
    const canPublish = dirty && (sessionStatus === 'ready' || sessionStatus === 'interrupted');
    const progress = progressLabel(publishState);
    const activeFailure = Boolean(publishError) && publishState.status === 'failed';
    const resumableFailure = publishState.status === 'failed' && publishState.retryable !== false && publishState.stage !== 'validation';
    const targetAlreadyUploaded = publishState.status === 'failed' && (publishState.stage === 'activation' || publishState.stage === 'settings');
    const canRename = !isPublishing && !targetAlreadyUploaded;

    useEffect(() => {
        setCopyName(`${themeName}-edited`);
    }, [themeName]);

    const openDialog = () => {
        setNameError(undefined);
        setPublishError(resumableFailure ? publishState.error : undefined);
        setOpen(true);
    };

    const closeForEditing = () => {
        setNameError(undefined);
        setPublishError(undefined);
        setOpen(false);
    };

    const submit = async () => {
        setNameError(undefined);
        setPublishError(undefined);
        let nextName: string | undefined;
        if (builtIn) {
            const validation = validateThemeCopyName(copyName, themeName, installedThemeNames);
            if (!validation.ok) {
                setNameError(validation.message);
                return;
            }
            nextName = validation.name;
        }
        try {
            const result = await onPublish(nextName);
            if (result.ok) {
                setOpen(false);
                return;
            }
            setPublishError(result.error.message);
        } catch (error) {
            setPublishError(error instanceof Error ? error.message : String(error));
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={(nextOpen) => {
            if (isPublishing) {
                return;
            }
            setOpen(nextOpen);
            if (nextOpen) {
                setNameError(undefined);
                setPublishError(resumableFailure ? publishState.error : undefined);
            }
        }}>
            <Button aria-label='Publish changes' className='shrink-0' disabled={!canPublish} type='button' onClick={openDialog}>
                <span aria-hidden='true' className='hidden sm:inline'>{sessionStatus === 'publishing' ? 'Publishing…' : 'Publish changes'}</span>
                <span aria-hidden='true' className='sm:hidden'>{sessionStatus === 'publishing' ? 'Publishing…' : 'Publish'}</span>
            </Button>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{builtIn ? 'Publish as a theme copy?' : 'Publish theme changes?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {builtIn
                            ? `Ghost’s built-in ${themeName} theme cannot be overwritten. Builder will upload and activate a new copy, then save the staged design settings.`
                            : `Builder will replace ${themeName} with the validated draft, then save the staged design settings. The live site will change immediately.`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Stack gap='sm'>
                    {builtIn && (
                        <Stack gap='xs'>
                            <Label htmlFor='builder-theme-copy-name'>Theme copy name</Label>
                            <Input
                                aria-invalid={Boolean(nameError)}
                                autoComplete='off'
                                disabled={!canRename}
                                id='builder-theme-copy-name'
                                maxLength={64}
                                value={copyName}
                                onChange={(event) => {
                                    setCopyName(event.target.value);
                                    setNameError(undefined);
                                }}
                            />
                        </Stack>
                    )}
                    {progress && <Text role='status' size='sm' tone='secondary'>{progress}</Text>}
                    {nameError && <Text className='text-destructive' role='alert' size='sm'>{nameError}</Text>}
                    {publishError && <Text className='text-destructive' role='alert' size='sm'>{publishError}</Text>}
                </Stack>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPublishing}>Cancel</AlertDialogCancel>
                    <Button disabled={isPublishing} type='button' onClick={() => activeFailure && publishState.retryable === false ? closeForEditing() : void submit()}>
                        {isPublishing ? 'Publishing…' : activeFailure && publishState.retryable === false ? 'Close and fix theme' : resumableFailure ? 'Retry publish' : builtIn ? 'Publish and activate copy' : 'Publish changes'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
