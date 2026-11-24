import {createHeadlessEditor} from '@lexical/headless';
import {BookmarkNode, ButtonNode, ToggleNode} from '../../src/index.js';
import {buildDefaultVisibility} from '../../src/utils/visibility.js';
import {createDocument} from '../test-utils/index.js';

const restricted = {
    web: {nonMember: false, memberSegment: 'status:-free'},
    email: {memberSegment: 'status:-free'}
};

for (const {Node, data, text} of [
    {Node: ButtonNode, data: {buttonText: 'Member button', buttonUrl: 'https://example.com'}, text: 'Member button'},
    {Node: ToggleNode, data: {heading: 'Member heading', content: '<p>Member content</p>'}, text: 'Member content'},
    {Node: BookmarkNode, data: {url: 'https://example.com', metadata: {title: 'Member bookmark'}, caption: 'Member caption'}, text: 'Member caption'}
]) {
    describe(`${Node.getType()} visibility`, function () {
        function withEditor(fn: () => void) {
            const editor = createHeadlessEditor({nodes: [Node]});
            return new Promise<void>((resolve, reject) => {
                editor.update(() => {
                    try {
                        fn();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        }

        it('defaults to visible and retains restrictions through clone and JSON round-trip', function () {
            return withEditor(() => {
                expect(new Node(data).visibility).toEqual(buildDefaultVisibility());
                const node = new Node({...data, visibility: restricted});
                expect(node.hasVisibility()).toBe(true);
                expect(Node.clone(node).visibility).toEqual(restricted);
                expect(Node.importJSON(node.exportJSON()).visibility).toEqual(restricted);
            });
        });

        for (const target of ['html', 'email']) {
            it(`gates the whole card on ${target}`, function () {
                return withEditor(() => {
                    const node = new Node({...data, visibility: restricted});
                    const result = node.exportDOM(undefined, {createDocument, target});
                    const element = result.element as HTMLElement & HTMLTextAreaElement;
                    const output = result.type === 'value' ? element.value : element.outerHTML;
                    expect(output).toContain(text);
                    expect(output).toContain(target === 'email' ? 'data-gh-segment="status:-free"' : 'kg-gated-block:begin nonMember:false memberSegment:"status:-free"');
                });
            });

            it(`omits the card when hidden on ${target}`, function () {
                return withEditor(() => {
                    const node = new Node({...data, visibility: {
                        web: {nonMember: false, memberSegment: ''}, email: {memberSegment: ''}
                    }});
                    const result = node.exportDOM(undefined, {createDocument, target});
                    expect(result.type).toBe('inner');
                    expect((result.element as HTMLElement).innerHTML).toBe('');
                });
            });
        }
    });
}
