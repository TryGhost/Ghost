import {$getNodeByKey} from 'lexical';
import {act, renderHook} from '@testing-library/react-hooks';
import {useVisibilityToggle} from '../../../src/hooks/useVisibilityToggle';
import {vi} from 'vitest';

// Mocking $getNodeByKey function
vi.mock('lexical', () => ({
    $getNodeByKey: vi.fn()
}));

describe('useVisibilityToggle', () => {
    let editor;
    let node;
    let initialVisibility;

    beforeEach(() => {
        node = {
            visibility: {}
        };

        editor = {
            update: vi.fn(callback => callback())
        };

        $getNodeByKey.mockReturnValue(node);

        initialVisibility = {
            emailOnly: false,
            segment: ''
        };
    });

    it('should initialize visibility states based on initialVisibility', () => {
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', initialVisibility));

        expect(result.current[0]).toBe(false); // emailVisibility
        expect(result.current[3]).toBe(true); // freeMemberVisibility
        expect(result.current[4]).toBe(true); // paidMemberVisibility
    });

    it('should toggle email visibility and update the node', () => {
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', initialVisibility));

        act(() => {
            result.current[1]({target: {checked: true}}); // toggleEmail
        });

        expect(result.current[0]).toBe(true); // emailVisibility
        expect(node.visibility.emailOnly).toBe(true);
    });

    it('should toggle freeMemberVisibility and update the node', () => {
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', initialVisibility));

        act(() => {
            result.current[2]({target: {checked: false}}, 'free'); // toggleMembers
        });

        expect(result.current[3]).toBe(false); // freeMemberVisibility
        expect(node.visibility.segment).toBe('status:paid');
    });

    it('should toggle paidMemberVisibility and update the node', () => {
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', initialVisibility));

        act(() => {
            result.current[2]({target: {checked: false}}, 'paid'); // toggleMembers
        });

        expect(result.current[4]).toBe(false); // paidMemberVisibility
        expect(node.visibility.segment).toBe('status:free');
    });
});
