import * as visibilityUtils from '../../../src/utils/visibility';
import {$getNodeByKey} from 'lexical';
import {VISIBILITY_SETTINGS} from '../../../src/utils/visibility';
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

    function callHook(visibility = DEFAULT_VISIBILITY, {stripeEnabled = true} = {}) {
        node.visibility = visibility;
        cardConfig.stripeEnabled = stripeEnabled;
        cardConfig.visibilitySettings = VISIBILITY_SETTINGS.WEB_AND_EMAIL;

        return renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));
    }

    it('calls getVisibilityOptions with correct arguments', () => {
        vi.spyOn(visibilityUtils, 'getVisibilityOptions');
        const visibility = {web: {nonMember: false, memberSegment: ''}, email: {memberSegment: 'status:free,status:-free'}};
        callHook(visibility);
        expect(visibilityUtils.getVisibilityOptions).toHaveBeenCalledWith(visibility, {isStripeEnabled: true, showWeb: true, showEmail: true});
    });

    it('calls getVisibilityOptions with showWeb only when visibilitySettings is "web only"', () => {
        vi.spyOn(visibilityUtils, 'getVisibilityOptions');
        cardConfig.visibilitySettings = VISIBILITY_SETTINGS.WEB_ONLY;
        const visibility = {web: {nonMember: false, memberSegment: ''}, email: {memberSegment: 'status:free,status:-free'}};
        node.visibility = visibility;
        renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));
        expect(visibilityUtils.getVisibilityOptions).toHaveBeenCalledWith(visibility, {isStripeEnabled: true, showWeb: true, showEmail: false});
    });

    it('calls getVisibilityOptions with showEmail only when visibilitySettings is "email only"', () => {
        vi.spyOn(visibilityUtils, 'getVisibilityOptions');
        cardConfig.visibilitySettings = VISIBILITY_SETTINGS.EMAIL_ONLY;
        const visibility = {web: {nonMember: false, memberSegment: ''}, email: {memberSegment: 'status:free,status:-free'}};
        node.visibility = visibility;
        renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));
        expect(visibilityUtils.getVisibilityOptions).toHaveBeenCalledWith(visibility, {isStripeEnabled: true, showWeb: false, showEmail: true});
    });

    it('returns correct visibilityOptions', () => {
        const {result} = callHook({web: {nonMember: true, memberSegment: 'status:free'}, email: {memberSegment: 'status:free'}});
        const {visibilityOptions} = result.current;

        expect(visibilityOptions).toEqual([
            {
                label: 'Web',
                key: 'web',
                toggles: [
                    {key: 'nonMembers', label: 'Public visitors', checked: true},
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

    it('returns working toggleVisibility function', () => {
        const {result} = callHook();
        const {toggleVisibility} = result.current;

        act(() => toggleVisibility('web', 'nonMembers', false));
        expect(node.visibility.web.nonMember).toBe(false);

        act(() => toggleVisibility('web', 'paidMembers', false));
        expect(node.visibility.web.memberSegment).toBe('status:free');
    });

    it('returns only web options when email visibility is disabled in cardConfig', () => {
        cardConfig.visibilitySettings = VISIBILITY_SETTINGS.WEB_ONLY;
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));

        expect(result.current.visibilityOptions).toEqual([
            {
                label: 'Web',
                key: 'web',
                toggles: [
                    {key: 'nonMembers', label: 'Public visitors', checked: true},
                    {key: 'freeMembers', label: 'Free members', checked: true},
                    {key: 'paidMembers', label: 'Paid members', checked: true}
                ]
            }
        ]);
    });

    it('returns only email options when web visibility is disabled in cardConfig', () => {
        cardConfig.visibilitySettings = VISIBILITY_SETTINGS.EMAIL_ONLY;
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));

        expect(result.current.visibilityOptions).toEqual([
            {
                label: 'Email',
                key: 'email',
                toggles: [
                    {key: 'freeMembers', label: 'Free members', checked: true},
                    {key: 'paidMembers', label: 'Paid members', checked: true}
                ]
            }
        ]);
    });

    it('returns isVisibilityEnabled as false when visibilitySettings is "none"', () => {
        cardConfig.visibilitySettings = VISIBILITY_SETTINGS.NONE;
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));

        expect(result.current.isVisibilityEnabled).toBe(false);
        expect(result.current.visibilityOptions).toEqual([]);
    });

    it('returns isVisibilityEnabled as true when visibilitySettings is "web and email"', () => {
        cardConfig.visibilitySettings = VISIBILITY_SETTINGS.WEB_AND_EMAIL;
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));

        expect(result.current.isVisibilityEnabled).toBe(true);
    });

    it('returns isVisibilityEnabled as true when visibilitySettings is "web only"', () => {
        cardConfig.visibilitySettings = VISIBILITY_SETTINGS.WEB_ONLY;
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));

        expect(result.current.isVisibilityEnabled).toBe(true);
    });

    it('returns isVisibilityEnabled as true when visibilitySettings is "email only"', () => {
        cardConfig.visibilitySettings = VISIBILITY_SETTINGS.EMAIL_ONLY;
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));

        expect(result.current.isVisibilityEnabled).toBe(true);
    });

    it('safely no-ops when toggling a hidden email group with "web only" setting', () => {
        cardConfig.visibilitySettings = VISIBILITY_SETTINGS.WEB_ONLY;
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));
        const beforeVisibility = structuredClone(node.visibility);

        act(() => result.current.toggleVisibility('email', 'freeMembers', false));

        expect(node.visibility).toEqual(beforeVisibility);
    });

    it('safely no-ops when toggling a hidden web group with "email only" setting', () => {
        cardConfig.visibilitySettings = VISIBILITY_SETTINGS.EMAIL_ONLY;
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));
        const beforeVisibility = structuredClone(node.visibility);

        act(() => result.current.toggleVisibility('web', 'nonMembers', false));

        expect(node.visibility).toEqual(beforeVisibility);
    });

    it('safely no-ops when toggling any group with "none" setting', () => {
        cardConfig.visibilitySettings = VISIBILITY_SETTINGS.NONE;
        const {result} = renderHook(() => useVisibilityToggle(editor, 'testKey', cardConfig));
        const beforeVisibility = structuredClone(node.visibility);

        act(() => result.current.toggleVisibility('web', 'nonMembers', false));
        expect(node.visibility).toEqual(beforeVisibility);

        act(() => result.current.toggleVisibility('email', 'freeMembers', false));
        expect(node.visibility).toEqual(beforeVisibility);
    });
});
