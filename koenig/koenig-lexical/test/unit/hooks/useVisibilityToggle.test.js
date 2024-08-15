import {$getNodeByKey} from 'lexical';
import {act, renderHook} from '@testing-library/react';
import {expect, vi} from 'vitest';
import {useVisibilityToggle} from '../../../src/hooks/useVisibilityToggle';

// Mocking $getNodeByKey function
vi.mock('lexical', () => ({
    $getNodeByKey: vi.fn()
}));

describe('useVisibilityToggle', () => {
    let editor;
    let node;
    let cardConfig;

    beforeEach(() => {
        node = {
            visibility: {
                showOnEmail: true,
                showOnWeb: true,
                segment: ''
            },
            getIsVisibilityActive: vi.fn(() => true)
        };

        editor = {
            update: vi.fn(callback => callback()),
            getEditorState: vi.fn(() => ({
                read: vi.fn(callback => callback())
            }))
        };

        $getNodeByKey.mockReturnValue(node);

        cardConfig = {
            stripeEnabled: true
        };
    });

    // These are the return values of useVisibilityToggle
    // in this specific order:
    // the number in the comment is the index of the return value
    // which is how we will access them in the tests
    // 0 is toggleEmail function
    // 1 is toggleSegment function
    // 2 is toggleWeb function
    // 3 is segment state
    // 4 is emailVisibility state
    // 5 is webVisibility state
    // 6 is dropdownOptions state
    // 7 is message state

    it('should render with return values based on editor state', () => {
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));

        expect(result.current[3]).toBe(node.visibility.segment); // segment
        expect(result.current[4]).toBe(node.visibility.showOnEmail); // emailVisibility
        expect(result.current[5]).toBe(node.visibility.showOnWeb); // webVisibility

        expect(result.current[6]).toEqual([
            {label: 'All subscribers', name: ''},
            {label: 'Free subscribers', name: 'status:free'},
            {label: 'Paid subscribers', name: 'status:-free'}
        ]); // dropdownOptions

        expect(result.current[7]).toBe(''); // message
    });

    it('should toggleEmail and be able to update the node', () => {
        const {result, rerender} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));

        act(() => {
            result.current[0]({target: {checked: false}}); // toggleEmail
        });

        rerender();

        expect(result.current[4]).toBe(false); // emailVisibility
        expect(node.visibility.showOnEmail).toBe(false);
        expect(result.current[7]).toBe('Shown on web only'); // message
    });

    it('should toggleWeb and be able to update the node', () => {
        const {result, rerender} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));

        act(() => {
            result.current[2]({target: {checked: false}}); // toggleWeb
        });

        rerender();

        expect(result.current[5]).toBe(false); // webVisibility
        expect(node.visibility.showOnWeb).toBe(false);
        expect(result.current[7]).toBe('Shown in email only'); // message
    });

    it('should toggleSegment and be able to update the node', () => {
        const {result, rerender} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));

        act(() => {
            result.current[1]('status:free'); // toggleSegment
        });

        rerender();

        expect(result.current[3]).toBe('status:free'); // segment
        expect(node.visibility.segment).toBe('status:free');
        expect(result.current[7]).toBe('Shown on web and email to free subscribers'); // message
    });

    it('should update the message correctly when both toggles are off', () => {
        const {result, rerender} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));

        act(() => {
            result.current[0]({target: {checked: false}}); // toggleEmail
            result.current[2]({target: {checked: false}}); // toggleWeb
        });

        rerender();

        expect(result.current[4]).toBe(false); // emailVisibility
        expect(result.current[5]).toBe(false); // webVisibility
        expect(result.current[7]).toBe('Hidden from both email and web'); // message
    });

    it('does not return dropdownOptions if stripe is not enabled', () => {
        cardConfig.stripeEnabled = false;

        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));

        expect(result.current[6]).toBeUndefined(); // dropdownOptions
    });
});
