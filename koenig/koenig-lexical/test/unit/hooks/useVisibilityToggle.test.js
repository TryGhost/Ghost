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
            showOnEmail: true,
            showOnWeb: true,
            segment: ''
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

    it('should initialize visibility states based on initialVisibility', () => {
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', initialVisibility));

        expect(result.current[3]).toBe(initialVisibility.segment); // segment
        expect(result.current[4]).toBe(initialVisibility.showOnEmail); // emailVisibility
        expect(result.current[5]).toBe(initialVisibility.showOnWeb); // webVisibility

        expect(result.current[6]).toEqual([
            {label: 'All subscribers', name: ''},
            {label: 'Free subscribers', name: 'status:free'},
            {label: 'Paid subscribers', name: 'status:-free'}
        ]); // dropdownOptions

        expect(result.current[7]).toBe('Shown on web and in email to all subscribers'); // message
    });

    it('should toggleEmail and be able to update the node', () => {
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', initialVisibility));

        act(() => {
            result.current[0]({target: {checked: false}}); // toggleEmail
        });

        expect(result.current[4]).toBe(false); // emailVisibility
        expect(node.visibility.showOnEmail).toBe(false);
        expect(result.current[7]).toBe('Only shown on web'); // message
    });

    it('should toggleWeb and be able to update the node', () => {
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', initialVisibility));

        act(() => {
            result.current[2]({target: {checked: false}}); // toggleWeb
        });

        expect(result.current[5]).toBe(false); // webVisibility
        expect(node.visibility.showOnWeb).toBe(false);
        expect(result.current[7]).toBe('Only shown in email to all subscribers'); // message
    });

    it('should toggleSegment and be able to update the node', () => {
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', initialVisibility));

        act(() => {
            result.current[1]('status:free'); // toggleSegment
        });

        expect(result.current[3]).toBe('status:free'); // segment
        expect(node.visibility.segment).toBe('status:free');
        expect(result.current[7]).toBe('Shown on web and in email to free subscribers'); // message
    });

    it('should update the message correctly when both toggles are off', () => {
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', initialVisibility));

        act(() => {
            result.current[0]({target: {checked: false}}); // toggleEmail
            result.current[2]({target: {checked: false}}); // toggleWeb
        });

        expect(result.current[4]).toBe(false); // emailVisibility
        expect(result.current[5]).toBe(false); // webVisibility
        expect(result.current[7]).toBe('Hidden from both email and web'); // message
    });
});