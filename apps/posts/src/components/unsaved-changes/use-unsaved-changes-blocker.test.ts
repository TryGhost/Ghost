import {type BlockableForm, useUnsavedChangesBlocker} from './use-unsaved-changes-blocker';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';

type ShouldBlockArgs = {
    currentLocation: {pathname: string};
    nextLocation: {pathname: string};
};

const mocks = vi.hoisted(() => ({
    blocker: {
        state: 'unblocked' as 'unblocked' | 'blocked' | 'proceeding',
        proceed: vi.fn(),
        reset: vi.fn()
    },
    shouldBlock: {current: null as ((args: ShouldBlockArgs) => boolean) | null},
    confirmUnload: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    useBlocker: (shouldBlock: (args: ShouldBlockArgs) => boolean) => {
        mocks.shouldBlock.current = shouldBlock;
        return mocks.blocker;
    },
    useConfirmUnload: (shouldConfirm: boolean) => mocks.confirmUnload(shouldConfirm)
}));

function makeForm(formState: Partial<BlockableForm['formState']> = {}): BlockableForm {
    return {
        formState: {isDirty: false, isSubmitting: false, ...formState},
        reset: vi.fn()
    };
}

function shouldBlockNavigation(from = '/tags/news', to = '/tags') {
    return mocks.shouldBlock.current!({
        currentLocation: {pathname: from},
        nextLocation: {pathname: to}
    });
}

describe('useUnsavedChangesBlocker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.blocker.state = 'unblocked';
        mocks.shouldBlock.current = null;
    });

    it('blocks navigation away while the form is dirty', () => {
        const form = makeForm({isDirty: true});
        renderHook(() => useUnsavedChangesBlocker(form));

        expect(shouldBlockNavigation()).toBe(true);
        expect(shouldBlockNavigation('/tags/news', '/tags/news')).toBe(false);
    });

    it('lets navigation through when the form is clean and idle', () => {
        const form = makeForm();
        renderHook(() => useUnsavedChangesBlocker(form));

        expect(shouldBlockNavigation()).toBe(false);
    });

    // Audit regression: navigating during an in-flight save unmounted the
    // form mid-save and silently swallowed failures
    it('blocks navigation while a save is in flight', () => {
        const form = makeForm({isDirty: true, isSubmitting: true});
        renderHook(() => useUnsavedChangesBlocker(form));

        expect(shouldBlockNavigation()).toBe(true);
    });

    it('hides the dialog while the blocked save is still in flight', () => {
        const form = makeForm({isDirty: true, isSubmitting: true});
        mocks.blocker.state = 'blocked';

        const {result} = renderHook(() => useUnsavedChangesBlocker(form));

        expect(result.current.isBlocked).toBe(false);
        expect(mocks.blocker.proceed).not.toHaveBeenCalled();
    });

    it('proceeds automatically when the in-flight save settles cleanly', () => {
        const form = makeForm({isDirty: true, isSubmitting: true});
        mocks.blocker.state = 'blocked';
        const {rerender} = renderHook(() => useUnsavedChangesBlocker(form));
        expect(mocks.blocker.proceed).not.toHaveBeenCalled();

        // the save succeeded: onSubmit reset the form to the saved values
        form.formState = {isDirty: false, isSubmitting: false};
        rerender();

        expect(mocks.blocker.proceed).toHaveBeenCalledTimes(1);
    });

    it('keeps blocking (dialog open) when the in-flight save fails', () => {
        const form = makeForm({isDirty: true, isSubmitting: true});
        mocks.blocker.state = 'blocked';
        const {result, rerender} = renderHook(() => useUnsavedChangesBlocker(form));

        // the save failed: the form is still dirty
        form.formState = {isDirty: true, isSubmitting: false};
        rerender();

        expect(mocks.blocker.proceed).not.toHaveBeenCalled();
        expect(result.current.isBlocked).toBe(true);
    });

    it('shows the dialog for a plain dirty block and never auto-proceeds', () => {
        const form = makeForm({isDirty: true});
        mocks.blocker.state = 'blocked';

        const {result, rerender} = renderHook(() => useUnsavedChangesBlocker(form));
        rerender();

        expect(result.current.isBlocked).toBe(true);
        expect(mocks.blocker.proceed).not.toHaveBeenCalled();
    });

    it('arms the unload confirmation while dirty or submitting', () => {
        const form = makeForm({isDirty: false, isSubmitting: true});
        const {rerender} = renderHook(() => useUnsavedChangesBlocker(form));
        expect(mocks.confirmUnload).toHaveBeenLastCalledWith(true);

        form.formState = {isDirty: true, isSubmitting: false};
        rerender();
        expect(mocks.confirmUnload).toHaveBeenLastCalledWith(true);

        form.formState = {isDirty: false, isSubmitting: false};
        rerender();
        expect(mocks.confirmUnload).toHaveBeenLastCalledWith(false);
    });

    it('leave() discards the edits and proceeds; stay() resets the blocker', () => {
        const form = makeForm({isDirty: true});
        mocks.blocker.state = 'blocked';
        const {result} = renderHook(() => useUnsavedChangesBlocker(form));

        result.current.leave();
        expect(form.reset).toHaveBeenCalledTimes(1);
        expect(mocks.blocker.proceed).toHaveBeenCalledTimes(1);

        result.current.stay();
        expect(mocks.blocker.reset).toHaveBeenCalledTimes(1);
    });
});
