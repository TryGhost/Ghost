import BASIC_NODES from '../nodes/BasicNodes';
import KoenigComposableEditor from './KoenigComposableEditor';
import KoenigComposer from './KoenigComposer';
import React from 'react';
import {BASIC_TRANSFORMERS} from '../plugins/MarkdownShortcutPlugin';
import {PaywallV2Node} from '../nodes/PaywallV2Node';

interface PaywallDefaultsEditorProps {
    initialEditorState: string;
    // which of the card's two paywalls this editor is for. Fixed, not chosen:
    // the surface is decided outside, so the card doesn't offer its own switch.
    target: 'web' | 'email';
    cardConfig?: Record<string, unknown>;
    fileUploader?: Record<string, unknown>;
    darkMode?: boolean;
    onChange?: (state: unknown) => void;
}

/**
 * One paywall card, on its own, outside a post.
 *
 * The same card the author edits mid-write - same nested editors, same settings
 * panel - so setting a default and changing one post's paywall are one skill
 * rather than two. It is the whole document here, which is why the card menu and
 * drag handles are left out: there is nothing to add and nowhere to move it to.
 */
export const PaywallDefaultsEditor: React.FC<PaywallDefaultsEditorProps> = ({
    initialEditorState,
    target,
    cardConfig = {},
    fileUploader = {},
    darkMode = false,
    onChange
}) => (
    <KoenigComposer
        // `paywallDefaults` marks the card as a global default rather than one
        // sitting in a post, which is what takes away the chrome that only means
        // something in a post - the surface switch and the margin indicator.
        cardConfig={{...cardConfig, paywallDefaults: {target}}}
        darkMode={darkMode}
        fileUploader={fileUploader}
        initialEditorState={initialEditorState}
        /* The editor shell mounts its link and markdown plugins unconditionally
           and both assert their nodes are registered, so the card alone isn't a
           configuration it supports. BASIC_NODES is what the card's own nested
           editors already run on, so this registers nothing new to the card. */
        nodes={[...BASIC_NODES, PaywallV2Node]}
    >
        <KoenigComposableEditor
            isDragEnabled={false}
            isSnippetsEnabled={false}
            // matched to the nodes above: the default set includes headings,
            // which nothing here registers
            markdownTransformers={BASIC_TRANSFORMERS}
            onChange={onChange}
        />
    </KoenigComposer>
);

export default PaywallDefaultsEditor;
