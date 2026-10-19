import {$isAtTopOfNode} from '../../../src/utils/$isAtTopOfNode';
import {describe, expect, it, vi} from 'vitest';
import {getTopLevelNativeElement} from '../../../src/utils/getTopLevelNativeElement';

describe('native selection boundaries', () => {
    it.each([null, document.createTextNode('detached'), document])('has no top-level element for an unavailable editor node', (node) => {
        expect(getTopLevelNativeElement(node)).toBeNull();
    });

    it('finds the containing top-level element for nested text', () => {
        const editor = document.createElement('div');
        editor.setAttribute('data-lexical-editor', 'true');
        editor.innerHTML = '<p><strong>Text</strong></p>';
        expect(getTopLevelNativeElement(editor.querySelector('strong').firstChild)).toBe(editor.firstChild);
    });

    it.each([null, {rangeCount: 0}])('does not measure a missing range', (selection) => {
        expect($isAtTopOfNode(selection)).toBe(false);
    });

    it('does not measure a range outside an editor', () => {
        const selection = {
            rangeCount: 1,
            anchorNode: document.createTextNode('detached'),
            getRangeAt: () => ({cloneRange: () => ({getClientRects: () => [{top: 0}]})})
        };
        expect($isAtTopOfNode(selection)).toBe(false);
    });

    it('compares a valid range with its containing editor element', () => {
        const editor = document.createElement('div');
        editor.setAttribute('data-lexical-editor', 'true');
        editor.innerHTML = '<p>Text</p>';
        vi.spyOn(editor.firstChild as Element, 'getBoundingClientRect').mockReturnValue({top: 20} as DOMRect);
        const selection = {
            rangeCount: 1,
            anchorNode: editor.firstChild.firstChild,
            getRangeAt: () => ({cloneRange: () => ({getClientRects: () => [{top: 25}]})})
        };
        expect($isAtTopOfNode(selection, 10)).toBe(true);
        expect($isAtTopOfNode(selection, 2)).toBe(false);
    });
});
