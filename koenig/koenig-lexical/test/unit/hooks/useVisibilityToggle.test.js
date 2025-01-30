import * as visibilityUtils from '../../../src/utils/visibility';
import {$getNodeByKey} from 'lexical';
import {act, renderHook} from '@testing-library/react';
import {expect, vi} from 'vitest';
import {useVisibilityToggle} from '../../../src/hooks/useVisibilityToggle';

describe('useVisibilityToggle', () => {
    let editor;
    let node;
    let cardConfig;

    const DEFAULT_VISIBILITY = {
        web: {
            nonMember: true,
            memberSegment: 'status:free,status:-free'
        },
        email: {
            memberSegment: 'status:free,status:-free'
        }
    };

    beforeEach(() => {
        // Mocking $getNodeByKey function
        vi.mock('lexical', () => ({
            $getNodeByKey: vi.fn()
        }));

        node = {
            visibility: DEFAULT_VISIBILITY,
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

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function callHook(visibility = DEFAULT_VISIBILITY, {stripeEnabled = true, feature = {contentVisibility: true}} = {}) {
        node.visibility = visibility;
        cardConfig.stripeEnabled = stripeEnabled;
        cardConfig.feature = feature;

        return renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));
    }

    it('calls getVisibilityOptions with correct arguments', () => {
        vi.spyOn(visibilityUtils, 'getVisibilityOptions');
        const visibility = {web: {nonMember: false, memberSegment: ''}, email: {memberSegment: 'status:free,status:-free'}};
        callHook(visibility);
        expect(visibilityUtils.getVisibilityOptions).toHaveBeenCalledWith(visibility, {isStripeEnabled: true});
    });

    it('returns correct visibilityOptions', () => {
        const {result} = callHook({web: {nonMember: true, memberSegment: 'status:free'}, email: {memberSegment: 'status:free'}});
        const {visibilityOptions} = result.current;

        expect(visibilityOptions).toEqual([
            {
                label: 'Web',
                key: 'web',
                toggles: [
                    {key: 'nonMembers', label: 'Anonymous visitors', checked: true},
                    {key: 'freeMembers', label: 'Free members', checked: true},
                    {key: 'paidMembers', label: 'Paid members', checked: false}
                ]
            },
            {
                label: 'Email',
                key: 'email',
                toggles: [
                    {key: 'freeMembers', label: 'Free members', checked: true},
                    {key: 'paidMembers', label: 'Paid members', checked: false}
                ]
            }
        ]);
    });

    it('calls generateVisibilityMessage with correct arguments', () => {
        vi.spyOn(visibilityUtils, 'generateVisibilityMessage');
        callHook();
        expect(visibilityUtils.generateVisibilityMessage).toHaveBeenCalledWith(DEFAULT_VISIBILITY);
    });

    it('returns correct visibilityMessage (contentVisibility)', () => {
        const {result} = callHook({web: {nonMember: false, memberSegment: ''}, email: {memberSegment: 'status:free,status:-free'}});
        const {visibilityMessage} = result.current;

        expect(visibilityMessage).toBe('Hidden on website');
    });

    it('returns correct visibilityMessage (contentVisibilityAlpha)', () => {
        const {result} = callHook({web: {nonMember: false, memberSegment: ''}, email: {memberSegment: 'status:free,status:-free'}}, {feature: {contentVisibilityAlpha: true}});
        const {visibilityMessage} = result.current;

        // NOTE: visibility message display has been removed in contentVisibilityAlpha
        expect(visibilityMessage).toBe('');
    });

    it('returns working toggleVisibility function', () => {
        const {result} = callHook();
        const {toggleVisibility} = result.current;

        act(() => toggleVisibility('web', 'nonMembers', false));
        expect(node.visibility.web.nonMember).toBe(false);

        act(() => toggleVisibility('web', 'paidMembers', false));
        expect(node.visibility.web.memberSegment).toBe('status:free');
    });
});
