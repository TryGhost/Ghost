import {useBlocker, useConfirmUnload} from '@tryghost/admin-x-framework';
import {useCallback, useEffect} from 'react';

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
 * Navigation during an in-flight save is blocked too, but silently: letting
 * it through unmounted the form mid-save and swallowed failures (the edits
 * were gone with zero feedback). Instead the navigation waits for the save
 * to settle — success resets the form, so the (now clean) navigation
 * proceeds automatically; failure leaves the form dirty, so the dialog opens
 * and the error toast is visible.
 *
 * Reads form state at navigation time (not via closed-over deps) so that
 * form.reset(...) before a programmatic navigate immediately disarms the
 * guard.
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
            return (dirtyNow || submittingNow) && currentLocation.pathname !== nextLocation.pathname;
        }, [form])
    );

    const {isDirty, isSubmitting} = form.formState;

    // a navigation blocked only because a save was in flight resolves itself
    // once the save settles: a successful save resets the form (clean ->
    // proceed); a failed save leaves it dirty and the dialog takes over
    useEffect(() => {
        if (blocker.state === 'blocked' && !isSubmitting && !isDirty) {
            blocker.proceed?.();
        }
    }, [blocker, isDirty, isSubmitting]);

    // an in-flight save also guards against browser unload: the save's
    // outcome (and any failure toast) would be lost with the page
    useConfirmUnload(isDirty || isSubmitting);

    return {
        // while waiting on the in-flight save there is nothing to ask the
        // user yet, so the dialog stays closed
        isBlocked: blocker.state === 'blocked' && !isSubmitting,
        stay: () => blocker.reset?.(),
        leave: () => {
            // discard unsaved edits so the (now clean) form lets navigation through
            form.reset();
            blocker.proceed?.();
        }
    };
}
