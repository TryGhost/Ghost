import {Component, Suspense, lazy, useEffect, useRef, useState} from 'react';

import {Button, Dialog, DialogContent, DialogDescription, DialogTitle, LoadingIndicator} from '@tryghost/shade/components';
import {useLocation} from 'react-router';

import {respondToArtifactBuilder, subscribeOpenArtifactBuilder, useEmberFeatureFlag} from '@/ember-bridge';

import type {ArtifactPayload} from './workspaces/artifact/artifact-state';
import type {OpenArtifactBuilderEvent} from '@/ember-bridge';
import type {ComponentType, ReactNode} from 'react';

const LazyArtifactBuilderExperience = lazy(() => import('./artifact-builder-experience'));

export type ArtifactBuilderExperienceProps = {
    request: OpenArtifactBuilderEvent;
    onCancel: () => void;
    onSave: (artifact: ArtifactPayload) => void;
};

type ArtifactBuilderHostProps = {
    Experience?: ComponentType<ArtifactBuilderExperienceProps>;
};

class ArtifactBuilderLoadBoundary extends Component<{children: ReactNode; onError: () => void}, {failed: boolean}> {
    state = {failed: false};

    static getDerivedStateFromError() {
        return {failed: true};
    }

    componentDidCatch() {
        this.props.onError();
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}

export const ArtifactBuilderHost = ({Experience}: ArtifactBuilderHostProps) => {
    const enabled = useEmberFeatureFlag('designBuilder');
    const location = useLocation();
    const locationSignature = `${location.pathname}${location.search}${location.hash}`;
    const enabledRef = useRef(enabled);
    const locationSignatureRef = useRef(locationSignature);
    const [request, setRequest] = useState<OpenArtifactBuilderEvent | null>(null);
    const requestRef = useRef<OpenArtifactBuilderEvent | null>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const originLocationRef = useRef<string | null>(null);
    enabledRef.current = enabled;
    locationSignatureRef.current = locationSignature;

    useEffect(() => {
        if (!request && returnFocusRef.current?.isConnected) {
            returnFocusRef.current.focus();
            returnFocusRef.current = null;
        }
    }, [request]);

    useEffect(() => {
        const activeRequest = requestRef.current;
        if (activeRequest && originLocationRef.current !== locationSignature) {
            respondToArtifactBuilder({requestId: activeRequest.requestId, status: 'cancelled'});
            requestRef.current = null;
            originLocationRef.current = null;
            setRequest(null);
        }
    }, [locationSignature]);

    useEffect(() => subscribeOpenArtifactBuilder((nextRequest) => {
        const bridgeEnabled = window.EmberBridge?.state.isFeatureEnabled?.('designBuilder');
        if ((bridgeEnabled ?? enabledRef.current) !== true) {
            respondToArtifactBuilder({requestId: nextRequest.requestId, status: 'error', message: 'Artifact Builder is not available on this site.'});
            return;
        }
        if (requestRef.current?.requestId === nextRequest.requestId) {
            return;
        }
        if (requestRef.current) {
            respondToArtifactBuilder({requestId: nextRequest.requestId, status: 'error', message: 'Finish the open Artifact before editing another one.'});
            return;
        }
        requestRef.current = nextRequest;
        originLocationRef.current = locationSignatureRef.current;
        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setRequest(nextRequest);
    }), []);

    if (!request) {
        return null;
    }

    const close = () => {
        requestRef.current = null;
        originLocationRef.current = null;
        setRequest(null);
    };
    const ActiveExperience = Experience ?? LazyArtifactBuilderExperience;
    const cancel = () => {
        respondToArtifactBuilder({requestId: request.requestId, status: 'cancelled'});
        close();
    };
    const fail = () => {
        respondToArtifactBuilder({requestId: request.requestId, status: 'error', message: 'Artifact Builder could not load. Please try again.'});
        close();
    };

    return (
        <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent
                aria-describedby='artifact-builder-description'
                aria-labelledby='artifact-builder-title'
                className='inset-0 top-0 left-0 h-dvh max-h-none w-screen max-w-none translate-x-0 gap-0 overflow-hidden rounded-none p-0 sm:rounded-none'
                onEscapeKeyDown={event => event.preventDefault()}
            >
                <DialogTitle className='sr-only' id='artifact-builder-title'>Artifact Builder</DialogTitle>
                <DialogDescription className='sr-only' id='artifact-builder-description'>Create or edit an interactive embed for this post.</DialogDescription>
                <ArtifactBuilderLoadBoundary onError={fail}>
                    <Suspense fallback={
                        <div className='flex size-full flex-col items-center justify-center gap-4'>
                            <LoadingIndicator size='lg' />
                            <Button type='button' variant='outline' onClick={cancel}>Cancel</Button>
                        </div>
                    }>
                        <ActiveExperience
                            request={request}
                            onCancel={cancel}
                            onSave={(artifact) => {
                                respondToArtifactBuilder({requestId: request.requestId, status: 'saved', artifact});
                                close();
                            }}
                        />
                    </Suspense>
                </ArtifactBuilderLoadBoundary>
            </DialogContent>
        </Dialog>
    );
};
