import {useEffect, useMemo, useRef, useState} from 'react';

import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useConfirmUnload} from '@tryghost/admin-x-framework';
import {Button} from '@tryghost/shade/components';
import {DirtyConfirmDialog} from '@tryghost/shade/patterns';
import {LucideIcon} from '@tryghost/shade/utils';
import {useBlocker} from 'react-router';
import {toast} from 'sonner';

import {BuilderShell} from './builder-shell';
import {BuilderAttachments} from './core/attachments';
import {BuilderSession} from './core/builder-session';
import {BrowserPiModelAccess} from './models/browser-pi-model-access';
import {CURATED_MODELS} from './models/curated-models';
import {createIframeArtifactPreview} from './workspaces/artifact/artifact-preview-adapter';
import {artifactBuilderPayload, artifactPayload, createArtifactDraft} from './workspaces/artifact/artifact-state';
import {ArtifactWorkspace} from './workspaces/artifact/artifact-workspace';

import type {ArtifactBuilderExperienceProps} from './artifact-builder-host';
import type {BuilderAttachmentSummary} from './core/attachments';
import type {BuilderSessionState} from './core/builder-session';
import type {PreviewInteractionMode} from './components/preview-panel';
import type {BuilderProvider} from './models/curated-models';
import type {ArtifactPreviewAdapter} from './workspaces/artifact/artifact-preview-adapter';
import type {ArtifactWorkspace as ArtifactWorkspaceInstance} from './workspaces/artifact/artifact-workspace';

const loadingState: BuilderSessionState = {
    status: 'loading',
    messages: [],
    workspace: {revision: '', dirty: false, validation: null}
};

function providerDefaultModel(provider: BuilderProvider): string {
    const model = CURATED_MODELS.find(item => item.provider === provider);
    if (!model) {
        throw new Error(`No Builder model is configured for ${provider}.`);
    }
    return model.id;
}

const ArtifactBuilderExperience = ({request, onCancel, onSave}: ArtifactBuilderExperienceProps) => {
    const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
    const [session, setSession] = useState<BuilderSession | null>(null);
    const [state, setState] = useState<BuilderSessionState>(loadingState);
    const [selection, setSelection] = useState<ReturnType<ArtifactWorkspaceInstance['getSelectionContext']>>(null);
    const [attachmentsList, setAttachmentsList] = useState<readonly BuilderAttachmentSummary[]>([]);
    const [provider, setProvider] = useState<BuilderProvider>('openai');
    const [modelId, setModelId] = useState(() => providerDefaultModel('openai'));
    const [previewMode, setPreviewMode] = useState<PreviewInteractionMode>('browse');
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [, setCredentialVersion] = useState(0);
    const modelAccess = useMemo(() => new BrowserPiModelAccess(), []);
    const {mutateAsync: uploadImage} = useUploadImage();
    const uploadImageRef = useRef(uploadImage);
    const previewRef = useRef<ArtifactPreviewAdapter | null>(null);
    const workspaceRef = useRef<ArtifactWorkspace | null>(null);
    const leaveConfirmedRef = useRef(false);
    uploadImageRef.current = uploadImage;
    const attachments = useMemo(() => new BuilderAttachments({
        uploadImage: async file => getImageUrl(await uploadImageRef.current({file}))
    }), []);

    useEffect(() => attachments.subscribe(setAttachmentsList), [attachments]);

    useEffect(() => {
        if (!iframe) {
            return;
        }
        const preview = createIframeArtifactPreview(iframe);
        const workspace = new ArtifactWorkspace({
            attachments,
            id: `artifact:${request.artifact.id}`,
            title: request.artifact.title || 'Untitled artifact',
            load: () => createArtifactDraft(artifactBuilderPayload(request.artifact)),
            preview,
            save: () => Promise.resolve()
        });
        const nextSession = new BuilderSession({modelAccess, workspace});
        previewRef.current = preview;
        workspaceRef.current = workspace;
        setSession(nextSession);
        const unsubscribeSession = nextSession.subscribe(setState);
        const unsubscribePreview = preview.subscribe(previewState => setSelection(previewState.selection));
        void nextSession.load().catch(() => {});

        return () => {
            unsubscribePreview();
            unsubscribeSession();
            nextSession.dispose();
            preview.destroy();
            previewRef.current = null;
            workspaceRef.current = null;
        };
    }, [attachments, iframe, modelAccess, request]);

    useEffect(() => {
        if (previewMode !== 'browse' && !['ready', 'interrupted'].includes(state.status)) {
            setPreviewMode('browse');
            void previewRef.current?.setInteractionMode('browse', new AbortController().signal).catch(() => {});
        }
    }, [previewMode, state.status]);

    const hasPromotedChanges = Boolean(workspaceRef.current?.hasPromotedChanges);
    const hasUnsavedWork = state.workspace.dirty || hasPromotedChanges;
    const shouldGuardNavigation = hasUnsavedWork || state.status === 'running' || state.status === 'publishing';
    useConfirmUnload(shouldGuardNavigation);
    const navigationBlocker = useBlocker(({currentLocation, nextLocation}) => shouldGuardNavigation
        && `${currentLocation.pathname}${currentLocation.search}${currentLocation.hash}` !== `${nextLocation.pathname}${nextLocation.search}${nextLocation.hash}`);
    const navigationBlocked = navigationBlocker.state === 'blocked';

    const selectModel = (nextProvider: BuilderProvider, nextModelId: string) => {
        modelAccess.selectModel(nextProvider, nextModelId);
        setProvider(nextProvider);
        setModelId(nextModelId);
    };

    const setPreviewInteractionMode = (mode: PreviewInteractionMode) => {
        if (mode === 'edit') {
            return;
        }
        void previewRef.current?.setInteractionMode(mode, new AbortController().signal)
            .then(() => setPreviewMode(mode))
            .catch(() => {});
    };

    const cancel = () => {
        if (hasUnsavedWork || state.status === 'running') {
            setConfirmCancel(true);
        } else {
            onCancel();
        }
    };

    const save = async () => {
        if (!session || !workspaceRef.current) {
            return;
        }
        try {
            const result = await session.publish();
            if (result.ok) {
                onSave(artifactPayload(workspaceRef.current.draft));
            } else {
                toast.error(result.error.message);
            }
        } catch {
            toast.error('The embed could not be saved. Please try again.');
        }
    };

    const canSave = ['ready', 'interrupted'].includes(state.status)
        && hasPromotedChanges
        && !workspaceRef.current?.hasCandidate;

    return (
        <>
            <BuilderShell
                attachments={attachmentsList}
                backAction={
                    <Button aria-label='Cancel Artifact Builder' size='icon' type='button' variant='ghost' onClick={cancel}>
                        <LucideIcon.X aria-hidden='true' />
                    </Button>
                }
                hasCredential={modelAccess.hasApiKey(provider)}
                modelId={modelId}
                models={CURATED_MODELS}
                preview={<iframe ref={setIframe} className='size-full border-0 bg-background' title='Artifact preview' />}
                previewAddress={false}
                previewControlsDisabled={!['ready', 'interrupted'].includes(state.status)}
                previewEdit={false}
                previewHistory={false}
                previewMode={previewMode}
                previewResponsive={true}
                provider={provider}
                publishAction={
                    <Button disabled={!canSave} type='button' onClick={() => void save()}>
                        Save
                    </Button>
                }
                selection={selection}
                state={state}
                title='Artifact Builder'
                onAddAttachments={async (files) => {
                    const result = await attachments.add(files);
                    if (result.errors.length) {
                        throw new Error(result.errors.map(error => error.message).join(' '));
                    }
                }}
                onForgetApiKey={(targetProvider) => {
                    modelAccess.forgetApiKey(targetProvider);
                    setCredentialVersion(value => value + 1);
                }}
                onRemoveAttachment={id => attachments.remove(id)}
                onRemoveSelection={() => void previewRef.current?.clearSelection()}
                onRetry={() => void session?.retryLastTurn()}
                onRewind={messageId => session?.rewind(messageId) ?? Promise.reject(new Error('The Builder session is not ready.'))}
                onSaveApiKey={(targetProvider, key) => {
                    modelAccess.setApiKey(targetProvider, key);
                    setCredentialVersion(value => value + 1);
                }}
                onSelectModel={selectModel}
                onSetPreviewMode={setPreviewInteractionMode}
                onStop={() => session?.stop()}
                onSubmit={value => session?.startTurn(value) ?? Promise.reject(new Error('The Builder session is not ready.'))}
            />
            <DirtyConfirmDialog
                open={confirmCancel}
                onConfirm={onCancel}
                onOpenChange={setConfirmCancel}
            />
            <DirtyConfirmDialog
                open={navigationBlocked}
                onConfirm={() => {
                    leaveConfirmedRef.current = true;
                    onCancel();
                    navigationBlocker.proceed?.();
                }}
                onOpenChange={(open) => {
                    if (open) {
                        return;
                    }
                    if (leaveConfirmedRef.current) {
                        leaveConfirmedRef.current = false;
                    } else {
                        navigationBlocker.reset?.();
                    }
                }}
            />
        </>
    );
};

export default ArtifactBuilderExperience;
