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
    // Config lists `header` as supporting visibility, so every version must
    // keep and apply it; a v1 header set through the API must not render publicly
    for (const version of [1, 2]) {
        it(`round-trips v${version} visibility`, function () {
            return withEditor(() => {
                const node = $createHeaderNode({version, header: 'Members', visibility: restricted});
                expect(node.hasVisibility()).toBe(true);
                expect(node.getIsVisibilityActive()).toBe(true);
                expect(HeaderNode.clone(node).visibility).toEqual(restricted);
                expect(node.exportJSON().visibility).toEqual(restricted);
                expect(HeaderNode.importJSON(node.exportJSON()).visibility).toEqual(restricted);
            });
        });
    }

    for (const target of ['html', 'email']) {
        it(`gates v1 and v2 on ${target}`, function () {
            return withEditor(() => {
                for (const version of [1, 2]) {
                    const node = $createHeaderNode({version, header: 'Members', visibility: restricted});
                    const result = node.exportDOM(undefined, {createDocument, target});
                    const element = result.element as HTMLElement & HTMLTextAreaElement;
                    const output = result.type === 'value' ? element.value : element.outerHTML;
                    expect(output).toContain('Members');
                    expect(output).toContain(target === 'email' ? 'data-gh-segment="status:-free"' : 'kg-gated-block:begin nonMember:false memberSegment:"status:-free"');
                }
            });
        });

        it(`omits v1 and v2 when hidden on ${target}`, function () {
            return withEditor(() => {
                for (const version of [1, 2]) {
                    const node = $createHeaderNode({version, header: 'Hidden', visibility: {
                        web: {nonMember: false, memberSegment: ''}, email: {memberSegment: ''}
                    }});
                    const result = node.exportDOM(undefined, {createDocument, target});
                    expect(result.type).toBe('inner');
                    expect((result.element as HTMLElement).innerHTML).toBe('');
                }
            });
        });
    }
});
