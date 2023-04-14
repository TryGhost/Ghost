// todo: WIP, should remove test after snippets will be ready for e2e tests
import {act, renderHook} from '@testing-library/react';
import {describe, it} from 'vitest';
import {useSnippets} from '../../demo/utils/useSnippets';

describe('useSnippets', () => {
    it('should work', function () {
        function getSnippetsFromStorage() {
            const snippetsStr = localStorage.getItem('snippets');

            return JSON.parse(snippetsStr);
        }

        const {result} = renderHook(() => useSnippets());

        expect(result.current.snippets).toEqual([]);

        act(() => {
            result.current.createSnippet('snapshot1', 'snapshot1 text');
        });
        expect(result.current.snippets).toEqual([{name: 'snapshot1', value: 'snapshot1 text'}]);
        expect(getSnippetsFromStorage()).toEqual([{name: 'snapshot1', value: 'snapshot1 text'}]);

        act(() => {
            result.current.deleteSnippet({name: 'snapshot1', value: 'snapshot1 text'});
        });
        expect(result.current.snippets).toEqual([]);
        expect(getSnippetsFromStorage()).toEqual([]);

        act(() => {
            result.current.createSnippet('snapshot2', 'snapshot2 text');
        });
        act(() => {
            result.current.createSnippet('snapshot3', 'snapshot3 text');
        });
        expect(result.current.snippets).toEqual([
            {name: 'snapshot2', value: 'snapshot2 text'},
            {name: 'snapshot3', value: 'snapshot3 text'}
        ]);
        expect(getSnippetsFromStorage()).toEqual([
            {name: 'snapshot2', value: 'snapshot2 text'},
            {name: 'snapshot3', value: 'snapshot3 text'}
        ]);
    });
});
