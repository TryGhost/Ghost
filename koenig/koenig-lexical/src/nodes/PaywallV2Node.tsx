import KoenigCardWrapper from '../components/KoenigCardWrapper';
import PaywallCardIcon from '../assets/icons/kg-card-type-paywall.svg?react';
import PaywallIndicatorIcon from '../assets/icons/kg-indicator-paywall.svg?react';
import {$generateHtmlFromNodes} from '@lexical/html';
import {$getRoot, createCommand} from 'lexical';
import {BASIC_NODES} from '../index.js';
import {PaywallV2Node as BasePaywallV2Node} from '@tryghost/kg-default-nodes';
import {PaywallV2NodeComponent} from './PaywallV2NodeComponent';
import {cleanBasicHtml} from '@tryghost/kg-clean-basic-html';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_PAYWALL_V2_COMMAND = createCommand();

// Bold is content, not styling - the heading arrives bold but the author can
// unbold or italicise it and every surface follows. Body copy stays plain, so
// only the first line of the paywall is emphasised.
const wrap = text => `<p><span style="white-space: pre-wrap;">${text}</span></p>`;
const wrapBold = text => `<p><strong><span style="white-space: pre-wrap;">${text}</span></strong></p>`;

// Headings come from Ghost's own paywalls - web from the `content-cta` template,
// email from the `paywall` email partial - so a card left untouched says what
// Ghost has always said.
export const DEFAULT_WEB_HEADINGS = {
    members: 'This post is for subscribers only',
    paid: 'This post is for paying subscribers only',
    tiers: 'This post is for subscribers on selected tiers only'
};

// Body copy is ours. Ghost's site paywall is a heading and a button with nothing
// between them, which leaves an editable card sitting on an empty placeholder -
// so each access level gets one line naming the action that unblocks the reader.
// "Keep reading" because a preview always cuts someone off mid-post, and nothing
// beyond that: the reader wants the rest of this post, not a pitch for a
// catalogue they haven't seen.
export const DEFAULT_WEB_TEXTS = {
    members: 'Sign up to keep reading.',
    paid: 'Become a paid member to keep reading.',
    tiers: 'Subscribe to keep reading.'
};

export const DEFAULT_EMAIL_HEADING = 'Upgrade to continue reading.';

// One line rather than one per access level: a members-only post has no email
// paywall at all, since everyone receiving it is already a member. So this only
// ever shows on paid and tier-gated posts.
export const DEFAULT_EMAIL_TEXT = 'Become a paid member to keep reading.';

// the renderer treats an unresolved paywall as members-only, so the copy matches
const webHeadingFor = access => wrapBold(DEFAULT_WEB_HEADINGS[access] || DEFAULT_WEB_HEADINGS.members);
const webTextFor = access => wrap(DEFAULT_WEB_TEXTS[access] || DEFAULT_WEB_TEXTS.members);

// Each target gets its own pair of nested editors so the web and email paywalls
// can say different things while sharing one set of design settings
const NESTED_EDITORS = [
    {editorName: '__webHeadingEditor', datasetKey: 'webHeadingEditor', valueKey: 'webHeading', default: dataset => webHeadingFor(dataset.access)},
    {editorName: '__webTextEditor', datasetKey: 'webTextEditor', valueKey: 'webTextValue', default: dataset => webTextFor(dataset.access)},
    {editorName: '__emailHeadingEditor', datasetKey: 'emailHeadingEditor', valueKey: 'emailHeading', default: () => wrapBold(DEFAULT_EMAIL_HEADING)},
    {editorName: '__emailTextEditor', datasetKey: 'emailTextEditor', valueKey: 'emailTextValue', default: () => wrap(DEFAULT_EMAIL_TEXT)}
] as const;

export class PaywallV2Node extends BasePaywallV2Node {
    __webHeadingEditor;
    __webHeadingEditorInitialState;
    __webTextEditor;
    __webTextEditorInitialState;
    __emailHeadingEditor;
    __emailHeadingEditorInitialState;
    __emailTextEditor;
    __emailTextEditorInitialState;

    // Named for what the author is making, not for the barrier. A paid post is
    // already walled - access settings put that wall at the top, where nobody
    // without access sees anything. This card doesn't add a wall, it moves it
    // down and opens a window above it, so "free preview" is the thing being
    // reached for. `paywall` stays as the shortcut and a search term, because
    // that's still the word people type.
    static kgMenu = {
        label: 'Free preview',
        desc: 'Free preview above, upgrade prompt below',
        Icon: PaywallCardIcon,
        insertCommand: INSERT_PAYWALL_V2_COMMAND,
        matches: ['free preview', 'preview', 'paywall', 'teaser', 'members only', 'paid', 'subscribe', 'upgrade', 'gate', 'premium'],
        priority: 6,
        shortcut: '/paywall',
        isHidden: ({config, editor}) => {
            if (config?.feature?.paywallV2 !== true) {
                return true;
            }

            // nothing to gate against when the site has no members
            if (config?.membersGatingEnabled === false) {
                return true;
            }

            // Offered on a public post too: reaching for a paywall is the
            // author saying they want part of the post gated, and the post is
            // gated to match (see PaywallV2Plugin). Asking them to set access
            // first would be asking them to answer the question twice.

            // a post can only hold one paywall - offer the card only once the
            // author has removed the one they have
            return !!editor && editor.getEditorState().read(
                () => $getRoot().getChildren().some($isPaywallV2Node)
            );
        }
    };

    static getType() {
        return 'paywall-v2';
    }

    getIcon() {
        return PaywallCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        NESTED_EDITORS.forEach(({editorName, datasetKey, valueKey, default: getDefault}) => {
            setupNestedEditor(this, editorName, {editor: dataset[datasetKey], nodes: BASIC_NODES});

            if (!dataset[datasetKey]) {
                populateNestedEditor(this, editorName, `${dataset[valueKey] || getDefault(dataset)}`);
            }
        });
    }

    getDataset() {
        const dataset = super.getDataset();
        // client-side only data properties such as nested editors
        const self = this.getLatest();

        NESTED_EDITORS.forEach(({editorName, datasetKey}) => {
            dataset[datasetKey] = self[editorName];
            dataset[`${datasetKey}InitialState`] = self[`${editorName}InitialState`];
        });

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because the serialized
        // values aren't automatically updated when a nested editor changes
        NESTED_EDITORS.forEach(({editorName, valueKey}) => {
            const nestedEditor = this[editorName];

            if (!nestedEditor) {
                return;
            }

            nestedEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(nestedEditor, null);
                json[valueKey] = cleanBasicHtml(html, {allowBr: true});
            });
        });

        return json;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                IndicatorIcon={PaywallIndicatorIcon}
                nodeKey={this.getKey()}
                wrapperStyle="regular"
            >
                <PaywallV2NodeComponent
                    access={this.access}
                    emailAlignment={this.emailAlignment}
                    emailBackgroundColor={this.emailBackgroundColor}
                    emailButtonColor={this.emailButtonColor}
                    emailButtonText={this.emailButtonText}
                    emailButtonTextColor={this.emailButtonTextColor}
                    emailButtonUrl={this.emailButtonUrl}
                    emailHeadingEditor={this.__emailHeadingEditor}
                    emailHeadingEditorInitialState={this.__emailHeadingEditorInitialState}
                    emailImageUrl={this.emailImageUrl}
                    emailLayout={this.emailLayout}
                    emailLinkColor={this.emailLinkColor}
                    emailShowButton={this.emailShowButton}
                    emailShowDividers={this.emailShowDividers}
                    emailTextEditor={this.__emailTextEditor}
                    emailTextEditorInitialState={this.__emailTextEditorInitialState}
                    nodeKey={this.getKey()}
                    tiers={this.tiers}
                    webAlignment={this.webAlignment}
                    webBackgroundColor={this.webBackgroundColor}
                    webButtonColor={this.webButtonColor}
                    webButtonText={this.webButtonText}
                    webButtonTextColor={this.webButtonTextColor}
                    webButtonUrl={this.webButtonUrl}
                    webHeadingEditor={this.__webHeadingEditor}
                    webHeadingEditorInitialState={this.__webHeadingEditorInitialState}
                    webImageUrl={this.webImageUrl}
                    webLayout={this.webLayout}
                    webLinkColor={this.webLinkColor}
                    webShowButton={this.webShowButton}
                    webShowDividers={this.webShowDividers}
                    webTextEditor={this.__webTextEditor}
                    webTextEditorInitialState={this.__webTextEditorInitialState}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createPaywallV2Node(dataset) {
    return new PaywallV2Node(dataset);
}

export function $isPaywallV2Node(node) {
    return node instanceof PaywallV2Node;
}
