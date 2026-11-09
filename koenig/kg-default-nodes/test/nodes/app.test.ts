import {createHash} from 'node:crypto';
import {dom} from '../test-utils/index.js';
import type {LexicalEditor} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {
    APP_CARD_FRAME_SCRIPT,
    APP_CARD_FRAME_SCRIPT_HASH,
    AppNode,
    $createAppNode,
    $isAppNode,
    cspSources,
    filterAppCardOrigins,
    renderAppCardDocument,
    sanitiseAppCardMarkup
} from '../../src/index.js';

const card = {
    appId: 'org.ghost.cards',
    card: 'big-number',
    properties: {title: 'Readers', number: '73%', secret: 'not public'},
    publicProperties: ['title'],
    html: '<div class="n">73%</div><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="https://cdn.example/a.png" onerror="alert(1)">',
    css: '.n{font-size:4rem}</style><script>alert(1)</script>',
    height: 180,
    emailHtml: '<p>73%</p><img src="https://cdn.example/a.png"><img src="https://evil.example/t.gif">'
};

describe('AppNode', function () {
    let editor: LexicalEditor;

    const editorTest = (testFn: () => void | Promise<void>) => () => new Promise<void>((resolve, reject) => {
        editor.update(() => {
            try {
                resolve(testFn());
            } catch (e) {
                reject(e);
            }
        });
    });

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: [AppNode]});
    });

    it('round-trips through JSON', editorTest(function () {
        const node = $createAppNode(card);
        expect($isAppNode(node)).toBe(true);
        const json = node.exportJSON();
        expect(json.type).toBe('app');
        expect(json.appId).toBe('org.ghost.cards');
        const imported = AppNode.importJSON(json);
        expect(imported.properties).toEqual(card.properties);
        expect(imported.publicProperties).toEqual(['title']);
    }));

    it('stores a snapshot template, public properties and email output, without scripts', editorTest(function () {
        const node = $createAppNode(card);
        const {element} = node.exportDOM(editor, {dom, exportFormat: 'html'} as never) as {element: HTMLElement};
        const html = element.outerHTML;

        expect(element.getAttribute('data-app-id')).toBe('org.ghost.cards');
        expect(element.getAttribute('data-app-card')).toBe('big-number');
        expect(element.getAttribute('data-app-height')).toBe('180');
        expect(html).toContain('<template class="kg-app-card-snapshot">');
        expect(html).toContain('<template class="kg-app-card-email">');
        expect(html).not.toContain('<script>alert');
        expect(html).not.toContain('javascript:');
        expect(html).not.toContain('onerror');
        // CSS can't close its style element.
        expect(html).toContain('\\3c /style>');
        const publicJson = element.querySelector('script.kg-app-card-public')!.textContent!;
        expect(JSON.parse(publicJson)).toEqual({title: 'Readers'});
    }));

    it('leaves a card out of email unless its app makes it available', editorTest(function () {
        const node = $createAppNode(card);
        const none = node.exportDOM(editor, {dom, target: 'email'} as never) as {element: HTMLElement};
        expect(none.element.innerHTML).toBe('');

        const available = node.exportDOM(editor, {
            dom,
            target: 'email',
            appCards: {lookup: () => ({imageOrigins: ['https://cdn.example'], mediaOrigins: []})}
        } as never) as {element: HTMLElement};
        expect(available.element.innerHTML).toContain('https://cdn.example/a.png');
        expect(available.element.innerHTML).not.toContain('evil.example');
    }));

    it('links to the post in email when the card has no email version', editorTest(function () {
        const node = $createAppNode({...card, emailHtml: ''});
        const {element} = node.exportDOM(editor, {
            dom,
            target: 'email',
            postUrl: 'https://site.example/post/',
            appCards: {lookup: () => ({imageOrigins: [], mediaOrigins: []})}
        } as never) as {element: HTMLElement};
        expect(element.innerHTML).toContain('href="https://site.example/post/"');
    }));
});

describe('app card document', function () {
    it('allows only its own script, by hash', function () {
        const hash = `sha256-${createHash('sha256').update(APP_CARD_FRAME_SCRIPT).digest('base64')}`;
        expect(APP_CARD_FRAME_SCRIPT_HASH).toBe(hash);
        const doc = renderAppCardDocument({
            html: '<p>Hi</p>',
            css: '',
            title: 'Card',
            imageOrigins: ['https://cdn.example/path', 'javascript:alert(1)'],
            mediaOrigins: []
        });
        expect(doc).toContain(`script-src &#39;${hash}&#39;`);
        expect(doc).toContain('img-src data: https://cdn.example;');
        expect(doc).toContain('media-src &#39;none&#39;');
    });

    it('drops images from origins that are not allowed', function () {
        const document = dom.window.document;
        const markup = filterAppCardOrigins(document, '<img src="https://a.example/x.png"><img src="https://b.example/y.png"><p style="background:url(https://b.example/z.png)">t</p>', ['https://a.example']);
        expect(markup).toContain('a.example');
        expect(markup).not.toContain('b.example');
    });

    it('keeps SVG animation, SVG images and escaped CSS out of email', function () {
        const document = dom.window.document;
        const allowed = ['https://good.example'];
        const animated = sanitiseAppCardMarkup(document, '<svg><a href="https://ok.example"><set attributeName="href" to="javascript:alert(1)"/><animate attributeName="href" values="javascript:alert(1)"/><text>x</text></a></svg>');
        expect(animated).not.toContain('javascript:');
        expect(animated).not.toMatch(/<set|<animate/i);
        const filtered = filterAppCardOrigins(document, '<svg><image href="https://evil.example/t"/><image href="https://good.example/a.png"/></svg><p style="background:u\\72l(https://evil.example/t)">x</p>', allowed);
        expect(filtered).not.toContain('evil.example');
        expect(filtered).toContain('good.example');
    });

    it('never widens the CSP with a wildcard host', function () {
        expect(cspSources(['https://*', 'https://*.example.com', 'https://ok.example'])).toBe('https://ok.example');
    });
});

