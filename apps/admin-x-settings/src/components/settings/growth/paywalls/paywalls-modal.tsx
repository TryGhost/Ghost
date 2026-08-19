import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {Suspense, useMemo, useState} from 'react';
import {Button, LoadingIndicator, Tabs, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {PAYWALLS, type PaywallAccess, type PaywallSurface, paywallCardState} from './paywall-defaults';
import {SettingsModal} from '@tryghost/shade/patterns';
import {koenigFileUploadTypes, useKoenigFileUpload} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import type {ComponentType} from 'react';

// @tryghost/koenig-lexical ships no type declarations, so declare just the
// surface used here rather than letting the whole module resolve as `any`.
interface PaywallDefaultsEditorProps {
    initialEditorState: string;
    target: PaywallSurface;
    cardConfig?: Record<string, unknown>;
    fileUploader?: Record<string, unknown>;
    onChange?: (state: unknown) => void;
}

// Its own chunk: the editor is a large dependency and Settings shouldn't carry
// it until someone opens this modal.
const PaywallEditor = React.lazy(async () => {
    const module = await import('@tryghost/koenig-lexical') as {PaywallDefaultsEditor: ComponentType<PaywallDefaultsEditorProps>};
    return {default: module.PaywallDefaultsEditor};
});

const fileUploader = {useFileUpload: useKoenigFileUpload, fileTypes: koenigFileUploadTypes};

const PaywallCard: React.FC<{surface: PaywallSurface, access: PaywallAccess, label: string}> = ({surface, access, label}) => {
    /**
     * The card reads the post it sits in to know what it's gating, so each
     * paywall is edited inside a post that exists only to say which one this is.
     */
    const cardConfig = useMemo(() => ({
        post: {visibility: access, tiers: []},
        membersGatingEnabled: true,
        feature: {paywallV2: true},
        // there's no post to gate, so the card mustn't try to change one
        visibilitySettings: 'none'
    }), [access]);

    const editorState = useMemo(() => paywallCardState(access), [access]);

    return (
        <section className='flex flex-col gap-3'>
            <h2 className='text-sm font-medium text-muted-foreground'>{label}</h2>
            <div className='koenig-lexical'>
                <Suspense fallback={<LoadingIndicator size='sm' />}>
                    <PaywallEditor
                        cardConfig={cardConfig}
                        fileUploader={fileUploader}
                        initialEditorState={editorState}
                        target={surface}
                    />
                </Suspense>
            </div>
        </section>
    );
};

const PaywallsModal: React.FC = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const [surface, setSurface] = useState<PaywallSurface>('web');

    const close = () => {
        modal.remove();
        updateRoute('paywalls');
    };

    return (
        <SettingsModal
            afterClose={() => updateRoute('paywalls')}
            footer={false}
            header={false}
            padding={false}
            size='full'
            testId='paywalls-modal'
            onCancel={close}
        >
            {/* The modal's own content box isn't a full-height column, so
                `flex-1` on the canvas has nothing to fill without this - it
                sizes to the cards and the grey stops where they do. */}
            <div className='flex h-full flex-col'>
                {/* Title left, surface centred, close right - the switch belongs
                    to the screen rather than to either card, because it decides
                    which cards are on it. */}
                <header className='relative flex h-16 shrink-0 items-center justify-between border-b border-border-default px-6'>
                    <h1 className='text-lg font-bold'>Paywalls</h1>

                    <div className='absolute left-1/2 -translate-x-1/2'>
                        <Tabs value={surface} variant='segmented' onValueChange={value => setSurface(value as PaywallSurface)}>
                            <TabsList>
                                <TabsTrigger value='web'>Web</TabsTrigger>
                                <TabsTrigger value='email'>Email</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <Button onClick={close}>Close</Button>
                </header>

                {/* Both web paywalls are on screen together rather than behind a
                    second switch: they're two different defaults, and seeing them
                    side by side is how you tell they say different things.

                    `m-auto` rather than `justify-center`: it centres the cards
                    when they're shorter than the canvas without clipping the top
                    of them once they aren't. */}
                <div className='flex flex-1 flex-col overflow-y-auto bg-preview-canvas'>
                    <div className='m-auto flex w-full max-w-[640px] flex-col gap-12 px-6 py-12'>
                        {PAYWALLS[surface].map(paywall => (
                            <PaywallCard
                                key={`${surface}-${paywall.access}`}
                                access={paywall.access}
                                label={paywall.label}
                                surface={surface}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </SettingsModal>
    );
};

export default NiceModal.create(PaywallsModal);
