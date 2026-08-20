import {useEffect, useRef, useState} from 'react';

import {useSearchParams} from '@tryghost/admin-x-framework';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {Stack, Text} from '@tryghost/shade/primitives';

import {BuilderSession} from './core/builder-session';
import {PublishThemeDialog} from './workspaces/theme/publish/publish-theme-dialog';
import {createAdminThemePublishTransport, ThemePublisher} from './workspaces/theme/publish/publish-theme';
import {withThemeRevision} from './workspaces/theme/theme-state';
import {ThemeWorkspace} from './workspaces/theme/theme-workspace';

import type {BuilderSessionState} from './core/builder-session';
import type {ModelAccessAdapter} from './core/model-access';
import type {PublishResult} from './core/workspace';
import type {ThemePublishState} from './workspaces/theme/publish/publish-theme';
import type {ThemeDraft} from './workspaces/theme/theme-state';

const loadingState: BuilderSessionState = {
    status: 'loading',
    messages: [],
    workspace: {revision: '', dirty: false, validation: null}
};

const noModel: ModelAccessAdapter = {
    runTurn: () => Promise.resolve()
};

async function proofDraft(builtIn: boolean): Promise<ThemeDraft> {
    const name = builtIn ? 'source' : 'edition';
    return withThemeRevision({
        revision: '',
        theme: {name, version: '1.0.0', builtIn, rootPrefix: `${name}/`},
        files: {
            'package.json': {path: 'package.json', kind: 'text', content: JSON.stringify({name, version: '1.0.0'}), binary: null, unixPermissions: null, dosPermissions: 0},
            'index.hbs': {path: 'index.hbs', kind: 'text', content: '<main>Initial</main>', binary: null, unixPermissions: null, dosPermissions: 0}
        },
        globalSettings: {accent_color: '#000000', heading_font: null, body_font: null, icon: null, logo: null, cover_image: null},
        customSettings: {
            layout: {id: 'layout', key: 'layout', type: 'select', value: 'List', default: 'List', options: ['List', 'Grid']}
        },
        renderer: {siteUrl: 'https://example.com/', contentApiKey: 'proof', config: {}, missing: []},
        virtualUrl: 'https://example.com/',
        selection: null
    });
}

export default function PublishRuntimeProof() {
    const [searchParams] = useSearchParams();
    const builtIn = searchParams.get('flow') !== 'custom';
    const [state, setState] = useState<BuilderSessionState>(loadingState);
    const [publishState, setPublishState] = useState<ThemePublishState>({status: 'idle', stage: 'idle'});
    const [result, setResult] = useState<PublishResult>();
    const [identity, setIdentity] = useState({name: builtIn ? 'source' : 'edition', builtIn});
    const sessionRef = useRef<BuilderSession | null>(null);
    const copyNameRef = useRef<string>();

    useEffect(() => {
        let active = true;
        let unsubscribeSession = () => {};
        let unsubscribePublisher = () => {};
        let nextSession: BuilderSession | null = null;
        void proofDraft(builtIn).then(async (initial) => {
            if (!active) {
                return;
            }
            const publisher = new ThemePublisher({baseline: initial, transport: createAdminThemePublishTransport(getGhostPaths().apiRoot)});
            const workspace = new ThemeWorkspace({
                id: `theme:${initial.theme.name}`,
                title: initial.theme.name,
                load: () => Promise.resolve(initial),
                preview: {
                    kind: 'theme',
                    renderCandidate: candidate => Promise.resolve({valid: true, diagnostics: [], revision: candidate.revision})
                },
                publish: (draft, signal) => publisher.publish(draft, {copyName: copyNameRef.current}, signal)
            });
            nextSession = new BuilderSession({workspace, modelAccess: noModel});
            sessionRef.current = nextSession;
            unsubscribeSession = nextSession.subscribe(setState);
            unsubscribePublisher = publisher.subscribe(setPublishState);
            await nextSession.load();
            const write = workspace.getTools().find(tool => tool.name === 'write_file');
            const settings = workspace.getTools().find(tool => tool.name === 'update_design_settings');
            const fileResult = await write!.execute({revision: workspace.draft.revision, path: 'index.hbs', content: '<main>Published</main>'}, new AbortController().signal);
            if (!fileResult.ok) {
                throw new Error(fileResult.error.message);
            }
            const settingsResult = await settings!.execute({
                revision: fileResult.revision,
                values: {'global.accent_color': '#123456', 'theme.layout': 'Grid'}
            }, new AbortController().signal);
            if (!settingsResult.ok) {
                throw new Error(settingsResult.error.message);
            }
            await workspace.promoteCandidate(new AbortController().signal);
        });
        return () => {
            active = false;
            unsubscribePublisher();
            unsubscribeSession();
            nextSession?.dispose();
            sessionRef.current = null;
        };
    }, [builtIn]);

    const publish = async (copyName?: string) => {
        copyNameRef.current = copyName;
        try {
            const nextResult = await sessionRef.current!.publish();
            setResult(nextResult);
            if (nextResult.ok && identity.builtIn && copyName) {
                setIdentity({name: copyName, builtIn: false});
            }
            return nextResult;
        } finally {
            copyNameRef.current = undefined;
        }
    };

    return (
        <Stack className='fixed inset-0 items-center justify-center bg-background p-6' gap='md'>
            <Text as='h1' size='xl' weight='semibold'>Theme publish proof</Text>
            <Text data-testid='publish-proof-flow'>Flow: {builtIn ? 'built-in' : 'custom'}</Text>
            <Text data-testid='publish-proof-dirty'>Dirty: {String(state.workspace.dirty)}</Text>
            <Text data-testid='publish-proof-result'>Result: {result ? result.ok ? `published:${identity.name}` : `failed:${result.error.code}` : 'pending'}</Text>
            <PublishThemeDialog
                builtIn={identity.builtIn}
                dirty={state.workspace.dirty}
                publishState={publishState}
                sessionStatus={state.status}
                themeName={identity.name}
                onPublish={publish}
            />
        </Stack>
    );
}
