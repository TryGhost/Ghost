import {useBlocker, useConfirmUnload} from '@tryghost/admin-x-framework';
import {useCallback} from 'react';

/**
 * The subset of a react-hook-form instance the blocker needs. Accepting the
 * narrow shape (rather than UseFormReturn) keeps the hook usable with any
 * form values type.
 */
export interface BlockableForm {
    formState: {
        isDirty: boolean;
        isSubmitting: boolean;
    };
    reset: () => void;
}

/**
 * Blocks in-app navigation (and browser unload) while the given form has
 * unsaved changes, mirroring the Ember admin's unsaved-changes guard.
 *
 * Reads form state at navigation time (not via closed-over deps) so that
 * form.reset(...) before a programmatic navigate immediately disarms the
 * guard, and an in-flight save (which completes regardless) doesn't show a
 * spurious dialog.
 *
 * Pair with <UnsavedChangesDialog>: `open` is `isBlocked`, wire `onStay` and
 * `onLeave`. `leave()` resets the form to its default values before
 * proceeding so the discarded edits don't re-trigger the blocker.
 */
export function useUnsavedChangesBlocker(form: BlockableForm) {
    const blocker = useBlocker(
        useCallback(({currentLocation, nextLocation}: {
            currentLocation: {pathname: string};
            nextLocation: {pathname: string};
        }) => {
            const {isDirty: dirtyNow, isSubmitting: submittingNow} = form.formState;
            return dirtyNow && !submittingNow && currentLocation.pathname !== nextLocation.pathname;
        }, [form])
    );

    useConfirmUnload(form.formState.isDirty);

    return {
        isBlocked: blocker.state === 'blocked',
        stay: () => blocker.reset?.(),
        leave: () => {
            // discard unsaved edits so the (now clean) form lets navigation through
            form.reset();
            blocker.proceed?.();
        }
    };
}
