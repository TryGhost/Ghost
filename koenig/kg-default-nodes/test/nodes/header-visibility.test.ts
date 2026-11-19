import {createHeadlessEditor} from '@lexical/headless';
import {HeaderNode, $createHeaderNode} from '../../src/index.js';
import {createDocument} from '../test-utils/index.js';

const restricted = {
    web: {nonMember: false, memberSegment: 'status:-free'},
    email: {memberSegment: 'status:-free'}
};

function withEditor(fn: () => void) {
    const editor = createHeadlessEditor({nodes: [HeaderNode]});
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

describe('Header visibility', function () {
    it('round-trips v2 visibility and keeps v1 unsupported', function () {
        return withEditor(() => {
            const node = $createHeaderNode({version: 2, header: 'Members', visibility: restricted});
            expect(node.hasVisibility()).toBe(true);
            expect(HeaderNode.clone(node).visibility).toEqual(restricted);
            expect(HeaderNode.importJSON(node.exportJSON()).visibility).toEqual(restricted);
            const legacy = $createHeaderNode({version: 1, header: 'Legacy', visibility: restricted});
            expect(legacy.hasVisibility()).toBe(false);
            expect(legacy.getIsVisibilityActive()).toBe(false);
            expect(legacy.exportJSON()).not.toHaveProperty('visibility');
        });
    });

    for (const target of ['html', 'email']) {
        it(`gates v2 on ${target} and leaves v1 unchanged`, function () {
            return withEditor(() => {
                for (const version of [1, 2]) {
                    const node = $createHeaderNode({version, header: 'Members', visibility: restricted});
                    const result = node.exportDOM(undefined, {createDocument, target});
                    const element = result.element as HTMLElement & HTMLTextAreaElement;
                    const output = result.type === 'value' ? element.value : element.outerHTML;
                    expect(output).toContain('Members');
                    expect(output.includes(target === 'email' ? 'data-gh-segment' : 'kg-gated-block')).toBe(version === 2);
                }
            });
        });

        it(`omits v2 when hidden on ${target}`, function () {
            return withEditor(() => {
                const node = $createHeaderNode({version: 2, header: 'Hidden', visibility: {
                    web: {nonMember: false, memberSegment: ''}, email: {memberSegment: ''}
                }});
                const result = node.exportDOM(undefined, {createDocument, target});
                expect(result.type).toBe('inner');
                expect((result.element as HTMLElement).innerHTML).toBe('');
            });
        });
    }
});
