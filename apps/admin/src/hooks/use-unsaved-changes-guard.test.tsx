import React from 'react';
import {RouterProvider, createMemoryRouter} from 'react-router';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it} from 'vitest';
import {useUnsavedChangesGuard} from './use-unsaved-changes-guard';
import type {UnsavedChangesGuard, UseUnsavedChangesGuardOptions} from './use-unsaved-changes-guard';

let latestGuard!: UnsavedChangesGuard;
let setOptions!: (options: UseUnsavedChangesGuardOptions) => void;

const GuardedScreen: React.FC<{initialOptions: UseUnsavedChangesGuardOptions}> = ({initialOptions}) => {
    const [options, set] = React.useState(initialOptions);
    setOptions = set;
    latestGuard = useUnsavedChangesGuard(options);
    return (
        <div>
            <span data-testid='dialog-open'>{String(latestGuard.dialogProps.open)}</span>
            <a href='#/ember-route'>Ember link</a>
        </div>
    );
};

const renderGuarded = (options: UseUnsavedChangesGuardOptions, {initialEntries = ['/guarded'], initialIndex}: {initialEntries?: string[]; initialIndex?: number} = {}) => {
    const router = createMemoryRouter([
        {path: '/guarded', element: <GuardedScreen initialOptions={options} />},
        {path: '/elsewhere', element: <div data-testid='elsewhere' />}
    ], {initialEntries, initialIndex});
    render(<RouterProvider router={router} />);
    return router;
};

const dialogOpen = () => screen.getByTestId('dialog-open').textContent;

describe('useUnsavedChangesGuard', () => {
    beforeEach(() => {
        // The admin's data router stamps its index onto every entry it
        // creates; the memory router used here never touches window.history,
        // so mirror that stamp for the untracked-POP check.
        window.history.replaceState({idx: 0}, '', '/');
    });

    it('lets a clean screen navigate away without blocking', async () => {
        const router = renderGuarded({when: false});

        await act(async () => {
            await router.navigate('/elsewhere');
        });

        expect(router.state.location.pathname).toBe('/elsewhere');
        expect(screen.getByTestId('elsewhere')).toBeInTheDocument();
    });

    it('blocks a router navigation while dirty and opens the discard dialog', async () => {
        const router = renderGuarded({when: true});

        await act(async () => {
            await router.navigate('/elsewhere');
        });

        expect(router.state.location.pathname).toBe('/guarded');
        expect(latestGuard.isBlocked).toBe(true);
        expect(dialogOpen()).toBe('true');
    });

    it('proceeds when confirmed, surviving the dialog auto-close that follows', async () => {
        const router = renderGuarded({when: true});
        await act(async () => {
            await router.navigate('/elsewhere');
        });

        act(() => {
            latestGuard.dialogProps.onConfirm();
            // DirtyConfirmDialog's confirm action auto-closes the dialog.
            latestGuard.dialogProps.onOpenChange(false);
        });

        await waitFor(() => {
            expect(router.state.location.pathname).toBe('/elsewhere');
        });
    });

    it('stays and re-arms when the dialog is cancelled', async () => {
        const router = renderGuarded({when: true});
        await act(async () => {
            await router.navigate('/elsewhere');
        });

        act(() => {
            latestGuard.dialogProps.onOpenChange(false);
        });

        expect(router.state.location.pathname).toBe('/guarded');
        expect(dialogOpen()).toBe('false');

        await act(async () => {
            await router.navigate('/elsewhere');
        });

        expect(router.state.location.pathname).toBe('/guarded');
        expect(dialogOpen()).toBe('true');
    });

    it('lets the next programmatic navigation through after bypassNextNavigation', async () => {
        const router = renderGuarded({when: true});

        await act(async () => {
            latestGuard.bypassNextNavigation();
            await router.navigate('/elsewhere');
        });

        expect(router.state.location.pathname).toBe('/elsewhere');
        expect(latestGuard.isBlocked).toBe(false);
    });

    it('consumes the bypass when the next navigation keeps the same pathname', async () => {
        const router = renderGuarded({
            when: true,
            interceptNavigation: ({nextLocation}) => nextLocation.search === '?tab=preview'
        });

        await act(async () => {
            latestGuard.bypassNextNavigation();
            await router.navigate('/guarded?tab=preview');
        });
        expect(router.state.location.search).toBe('?tab=preview');
        expect(latestGuard.interceptedNavigation.isBlocked).toBe(false);

        await act(async () => {
            await router.navigate('/elsewhere');
        });

        expect(router.state.location.pathname).toBe('/guarded');
        expect(latestGuard.isBlocked).toBe(true);
        expect(dialogOpen()).toBe('true');
    });

    it('holds a navigation blocked during a save and resumes it once the save settles', async () => {
        const router = renderGuarded({when: true, isSaving: true});
        await act(async () => {
            await router.navigate('/elsewhere');
        });

        expect(router.state.location.pathname).toBe('/guarded');
        // The save in flight suppresses the discard dialog.
        expect(dialogOpen()).toBe('false');

        let resumed = false;
        act(() => {
            resumed = latestGuard.resumeBlockedNavigationAfterSave();
        });
        expect(resumed).toBe(true);

        act(() => {
            setOptions({when: false, isSaving: false});
        });

        await waitFor(() => {
            expect(router.state.location.pathname).toBe('/elsewhere');
        });
    });

    it('reports no blocked navigation to resume when nothing was blocked', () => {
        renderGuarded({when: true});

        expect(latestGuard.resumeBlockedNavigationAfterSave()).toBe(false);
    });

    it('hands intercepted navigations to the caller instead of the discard dialog', async () => {
        const router = renderGuarded({
            when: false,
            interceptNavigation: ({nextLocation}) => nextLocation.search === '?claimed'
        });

        await act(async () => {
            await router.navigate('/elsewhere?claimed');
        });

        expect(router.state.location.pathname).toBe('/guarded');
        expect(latestGuard.interceptedNavigation.isBlocked).toBe(true);
        expect(latestGuard.isBlocked).toBe(false);
        expect(dialogOpen()).toBe('false');

        act(() => {
            latestGuard.interceptedNavigation.reset();
        });
        expect(router.state.location.pathname).toBe('/guarded');
        expect(latestGuard.interceptedNavigation.isBlocked).toBe(false);

        await act(async () => {
            await router.navigate('/elsewhere?claimed');
        });
        act(() => {
            latestGuard.interceptedNavigation.proceed();
        });

        await waitFor(() => {
            expect(router.state.location.pathname).toBe('/elsewhere');
        });
    });

    it('blocks a POP on a router-created entry but lets an untracked POP through', async () => {
        const router = renderGuarded({when: true}, {initialEntries: ['/elsewhere', '/guarded'], initialIndex: 1});

        await act(async () => {
            await router.navigate(-1);
        });
        expect(router.state.location.pathname).toBe('/guarded');
        expect(dialogOpen()).toBe('true');

        act(() => {
            latestGuard.dialogProps.onOpenChange(false);
        });

        // Native hash navigations do not carry the router's history index; a
        // POP from such an entry cannot be undone safely, so it passes.
        window.history.replaceState({}, '');
        await act(async () => {
            await router.navigate(-1);
        });
        expect(router.state.location.pathname).toBe('/elsewhere');
    });

    it('intercepts raw hash-anchor clicks and performs them on confirm', () => {
        renderGuarded({when: true});

        fireEvent.click(screen.getByText('Ember link'));

        expect(latestGuard.isBlocked).toBe(true);
        expect(dialogOpen()).toBe('true');

        act(() => {
            latestGuard.dialogProps.onConfirm();
            latestGuard.dialogProps.onOpenChange(false);
        });

        expect(window.location.hash).toBe('#/ember-route');
    });
});
