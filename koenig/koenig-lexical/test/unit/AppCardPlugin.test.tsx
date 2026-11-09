import AppCardPlugin from '../../src/plugins/AppCardPlugin';
import KoenigComposerContext from '../../src/context/KoenigComposerContext';
import {$createAppNode, $isAppNode, AppNode, INSERT_APP_CARD_COMMAND, UPDATE_APP_CARD_COMMAND} from '../../src/nodes/AppNode';
import {$getRoot, COMMAND_PRIORITY_LOW, createEditor} from 'lexical';
import {INSERT_CARD_COMMAND} from '../../src/plugins/KoenigBehaviourPlugin';
import {act, cleanup, render} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {buildCardMenu} from '../../src/utils/buildCardMenu';
import type {AppCardRenderOutput, AppCardsConfig} from '../../src/utils/app-cards';

const context = vi.hoisted(() => ({editor: null}));
vi.mock('@lexical/react/LexicalComposerContext', () => ({useLexicalComposerContext: () => [context.editor]}));

const definition = {
    appId: 'org.ghost.cards',
    appName: 'Demo cards',
    name: 'big-number',
    label: 'Big number',
    icon: 'hash',
    keywords: ['stat'],
    accentColor: '#ff5500',
    hasSettings: true,
    imageOrigins: [],
    mediaOrigins: []
};

const output = (number: string): AppCardRenderOutput => ({
    html: `<p>${number}</p>`,
    css: '',
    height: 120,
    email_html: `<p>${number}</p>`,
    public_properties: []
});

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => {
        resolve = done;
    });
    return {promise, resolve};
}

describe('AppCardPlugin', () => {
    let editor;
    let appCards: AppCardsConfig;
    let onError;

    beforeEach(() => {
        onError = vi.fn();
        editor = createEditor({onError, nodes: [AppNode]});
        context.editor = editor;
        // Stands in for KoenigBehaviourPlugin's insert.
        editor.registerCommand(INSERT_CARD_COMMAND, ({cardNode}) => {
            $getRoot().append(cardNode);
            return true;
        }, COMMAND_PRIORITY_LOW);
        appCards = {
            cards: [definition],
            definition: (appId, card) => (appId === definition.appId && card === definition.name ? definition : undefined),
            render: vi.fn(),
            openSettings: vi.fn()
        };
        render(
            <KoenigComposerContext.Provider value={{cardConfig: {appCards}, onError} as never}>
                <AppCardPlugin />
            </KoenigComposerContext.Provider>
        );
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const readCard = () => editor.getEditorState().read(() => {
        const node = $getRoot().getChildren().find($isAppNode);
        return node ? {key: node.getKey(), properties: node.properties, html: node.html, emailHtml: node.emailHtml} : null;
    });

    it('inserts a placeholder, then the rendered snapshot', async () => {
        const rendered = deferred<AppCardRenderOutput>();
        vi.mocked(appCards.render).mockReturnValue(rendered.promise);

        await act(async () => {
            editor.update(() => {
                editor.dispatchCommand(INSERT_APP_CARD_COMMAND, {appId: definition.appId, card: definition.name});
            }, {discrete: true});
        });
        expect(readCard()?.html).toContain('Loading card');

        await act(async () => {
            rendered.resolve(output('73%'));
            await rendered.promise;
        });
        expect(readCard()).toMatchObject({html: '<p>73%</p>', emailHtml: '<p>73%</p>', properties: {}});
        expect(appCards.render).toHaveBeenCalledWith(definition.appId, definition.name, {});
    });

    it('never leaves a card loading when a proposal made during the first render fails', async () => {
        const first = deferred<AppCardRenderOutput>();
        let failProposal!: (error: Error) => void;
        const proposal = new Promise<AppCardRenderOutput>((_, reject) => {
            failProposal = reject;
        });
        vi.mocked(appCards.render).mockReturnValueOnce(first.promise).mockReturnValueOnce(proposal);

        await act(async () => {
            editor.update(() => {
                editor.dispatchCommand(INSERT_APP_CARD_COMMAND, {appId: definition.appId, card: definition.name});
            }, {discrete: true});
        });
        const key = readCard()!.key;
        await act(async () => {
            editor.update(() => {
                editor.dispatchCommand(UPDATE_APP_CARD_COMMAND, {nodeKey: key, patch: {number: '2'}, reject: () => {}});
            }, {discrete: true});
        });
        await act(async () => {
            first.resolve(output('73%'));
            await first.promise;
        });
        expect(readCard()?.html).toContain('Loading card');
        await act(async () => {
            failProposal(new Error('render failed'));
            await proposal.catch(() => {});
        });
        expect(readCard()).toMatchObject({html: '<p>73%</p>', properties: {}});
    });

    it('refuses to insert a card no installed app offers', () => {
        let handled;
        editor.update(() => {
            handled = editor.dispatchCommand(INSERT_APP_CARD_COMMAND, {appId: 'org.example.gone', card: 'x'});
        }, {discrete: true});
        expect(handled).toBe(false);
        expect(appCards.render).not.toHaveBeenCalled();
    });

    it('applies proposed properties together with their render, dropping a stale one', async () => {
        editor.update(() => {
            $getRoot().append($createAppNode({appId: definition.appId, card: definition.name, properties: {number: '1'}, ...{html: '<p>1</p>', css: '', height: 120, emailHtml: '', publicProperties: []}}));
        }, {discrete: true});
        const {key} = readCard()!;

        const first = deferred<AppCardRenderOutput>();
        const second = deferred<AppCardRenderOutput>();
        vi.mocked(appCards.render).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

        editor.update(() => {
            editor.dispatchCommand(UPDATE_APP_CARD_COMMAND, {nodeKey: key, patch: {number: '2'}});
            editor.dispatchCommand(UPDATE_APP_CARD_COMMAND, {nodeKey: key, patch: {label: 'Readers'}});
        }, {discrete: true});
        // The second proposal builds on the first, not on what's saved.
        expect(appCards.render).toHaveBeenLastCalledWith(definition.appId, definition.name, {number: '2', label: 'Readers'});

        await act(async () => {
            second.resolve(output('2 · Readers'));
            await second.promise;
        });
        await act(async () => {
            first.resolve(output('2'));
            await first.promise;
        });

        expect(readCard()).toMatchObject({properties: {number: '2', label: 'Readers'}, html: '<p>2 · Readers</p>'});
        expect(onError).not.toHaveBeenCalled();
    });

    it('keeps the saved card when a render fails', async () => {
        editor.update(() => {
            $getRoot().append($createAppNode({appId: definition.appId, card: definition.name, properties: {number: '1'}, html: '<p>1</p>', css: '', height: 120, emailHtml: '', publicProperties: []}));
        }, {discrete: true});
        const {key} = readCard()!;
        vi.mocked(appCards.render).mockRejectedValue(new Error('backend down'));
        const reject = vi.fn();

        await act(async () => {
            editor.update(() => {
                editor.dispatchCommand(UPDATE_APP_CARD_COMMAND, {nodeKey: key, patch: {number: '2'}, reject});
            }, {discrete: true});
        });

        expect(reject).toHaveBeenCalled();
        expect(readCard()).toMatchObject({properties: {number: '1'}, html: '<p>1</p>'});
    });
});

describe('buildCardMenu with app cards', () => {
    it('lists installed apps’ cards in an Apps section', () => {
        const appCards = {cards: [definition], definition: () => definition} as unknown as AppCardsConfig;
        const {menu} = buildCardMenu([], {config: {appCards}} as never);
        const [item] = menu.get('Apps');
        expect(item).toMatchObject({
            nodeType: 'app',
            label: 'Big number',
            desc: 'Demo cards',
            shortcut: '/big-number',
            insertCommand: INSERT_APP_CARD_COMMAND,
            insertParams: {appId: 'org.ghost.cards', card: 'big-number'}
        });
        expect(buildCardMenu([], {query: 'stat', config: {appCards}} as never).menu.get('Apps')).toHaveLength(1);
        expect(buildCardMenu([], {query: 'nothing', config: {appCards}} as never).menu.get('Apps')).toBeUndefined();
    });
});
