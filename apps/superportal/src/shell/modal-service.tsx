import {createElement, useState, type ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {ModalIframe} from '../shared/components/modal/ModalIframe';
import {ErrorBoundary} from '../shared/components/ErrorBoundary';
import {cn} from '../shared/cn';
import sharedTailwindCss from '../shared/styles/tailwind.css?inline';
import sharedAnimationsCss from '../shared/styles/animations.css?inline';
import type {ModalHandle, ModalOptions, PortalState} from '../types';

/**
 * Single-iframe modal service owned by the shell.
 *
 * Lifecycle:
 *  - First call to `open()` creates the iframe and React root, mounts content.
 *  - Subsequent calls swap content (same iframe, no teardown).
 *  - `close()` unmounts content but leaves the iframe in the DOM for snappy reopen.
 *  - Escape and click-outside close the active modal.
 *
 * Every modal iframe automatically receives:
 *  - BASE_MODAL_CSS (this file's backdrop/panel chrome)
 *  - shared/styles/tailwind.css (Tailwind v4 with `gh:` prefix)
 *  - shared/styles/animations.css (popover slide-in etc.)
 *  - feature CSS supplied via `options.css`
 */
interface ModalServiceDeps {
    /**
     * Snapshot accessor for the shell's state. Used at modal-open time to
     * read host-page values that need to flow into the iframe (accent
     * colour, dir, etc.) — pulled at open time rather than memoised so
     * runtime updates from features (signin etc.) take effect.
     */
    getState(): PortalState;
    /** Active-locale text direction, applied to the iframe `<html>`. */
    getDir?(): 'ltr' | 'rtl';
    /**
     * Optional shell-level callback fired after each modal close. The shell
     * uses this to clear hash routes that the URL got stuck on (e.g.,
     * `#/share` lingering after the modal dismisses). Decoupled from
     * `ModalOptions.onClose` (the per-feature one) so behaviours that need
     * to fire for EVERY modal close — body-scroll restore, URL cleanup —
     * don't depend on every feature remembering to wire them.
     */
    onModalClosed?(): void;
}

export class ModalService {
    private host: HTMLElement | null = null;
    private root: Root | null = null;
    private currentClose: (() => void) | null = null;
    private currentOnClose: (() => void) | null = null;
    private currentDismissible = true;
    private current: {content: ReactNode; css?: string; panelClass?: string; backdropClass?: string} | null = null;
    private deps: ModalServiceDeps;

    /**
     * Saved body-scroll state captured on the first open in a session and
     * restored on close. Mirrors apps/portal/src/app.js:104 — locks page
     * scroll while the modal is open and compensates for the lost
     * scrollbar width to prevent the page from shifting horizontally.
     */
    private priorBodyOverflow: string | null = null;
    private priorBodyMarginRight: string | null = null;

    constructor(deps: ModalServiceDeps) {
        this.deps = deps;
    }

    open(content: ReactNode, options: ModalOptions = {}): ModalHandle {
        // Close any active modal — modal stacking is intentionally unsupported.
        // Replacement bypasses the dismissible guard: a non-dismissible modal
        // can still be swapped for a new one (the preview re-mount path).
        this.destroyCurrent();
        const {css, panelClass, backdropClass, onClose, dismissible = true} = options;

        this.lockBodyScroll();

        const close = (): void => {
            if (this.currentClose !== close) return;
            if (!this.currentDismissible) return;
            this.destroyCurrent();
        };
        this.currentClose = close;
        this.currentOnClose = onClose ?? null;
        this.currentDismissible = dismissible;
        this.current = {content, css, panelClass, backdropClass};

        this.render();
        return {
            close,
            setChrome: (chrome) => {
                // Ignore stale handles from a modal that has since closed.
                if (this.currentClose !== close || !this.current) return;
                if (chrome.panelClass !== undefined) this.current.panelClass = chrome.panelClass;
                if (chrome.backdropClass !== undefined) this.current.backdropClass = chrome.backdropClass;
                this.render();
            }
        };
    }

    /** Unconditional teardown — used for replacement, error recovery, and dismissal. */
    private destroyCurrent(): void {
        if (!this.current && !this.currentClose) return;
        const onClose = this.currentOnClose;
        this.currentClose = null;
        this.currentOnClose = null;
        this.currentDismissible = true;
        this.current = null;
        this.render();
        this.unlockBodyScroll();
        onClose?.();
        this.deps.onModalClosed?.();
    }

    private lockBodyScroll(): void {
        // Skip if already locked (a previous modal didn't get to close before
        // the new one opened — currentClose was reused).
        if (this.priorBodyOverflow !== null) return;
        try {
            const body = document.body;
            this.priorBodyOverflow = body.style.overflow;
            this.priorBodyMarginRight = body.style.marginRight;
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            body.style.overflow = 'hidden';
            // Reserve the disappearing scrollbar's width so the page doesn't
            // shift horizontally when the lock kicks in.
            if (scrollbarWidth > 0) {
                const computed = window.getComputedStyle(body).marginRight || '0px';
                body.style.marginRight = `calc(${computed} + ${scrollbarWidth}px)`;
            }
        } catch {
            // Ignore — best-effort body-lock matches portal's pattern.
        }
    }

    private unlockBodyScroll(): void {
        if (this.priorBodyOverflow === null) return;
        try {
            const body = document.body;
            body.style.overflow = this.priorBodyOverflow;
            body.style.marginRight = this.priorBodyMarginRight ?? '';
        } catch {
            // Ignore.
        }
        this.priorBodyOverflow = null;
        this.priorBodyMarginRight = null;
    }

    private render(): void {
        if (!this.host) {
            this.host = document.createElement('div');
            this.host.setAttribute('data-superportal-modal-host', '');
            document.body.appendChild(this.host);
            this.root = createRoot(this.host);
        }
        if (!this.root) return;

        if (this.current === null) {
            this.root.render(null);
            return;
        }

        const state = this.deps.getState();
        const accentColor = state.site.accent_color || '#15171a';
        const dir = this.deps.getDir?.() ?? 'ltr';

        this.root.render(
            createElement(
                ErrorBoundary,
                // Forced teardown on error: open() locked body scroll, and a
                // silent null render would leave the host page stuck that way.
                // Bypasses the dismissible guard on purpose.
                {onError: () => this.destroyCurrent()},
                createElement(ModalShell, {
                    content: this.current.content,
                    css: this.current.css,
                    panelClass: this.current.panelClass,
                    backdropClass: this.current.backdropClass,
                    accentColor,
                    dir,
                    onRequestClose: () => this.currentClose?.()
                })
            )
        );

        // Ghost Admin's preview pane shows a spinner until this arrives.
        // Sent on every render, matching portal popup-modal.js:139-146.
        if (state.preview && window.self !== window.parent) {
            window.parent.postMessage({type: 'portal-preview-ready', payload: {}}, '*');
        }
    }
}

interface ModalShellProps {
    content: ReactNode;
    css?: string;
    panelClass?: string;
    backdropClass?: string;
    accentColor: string;
    dir: 'ltr' | 'rtl';
    onRequestClose(): void;
}

function ModalShell({content, css, panelClass, backdropClass, accentColor, dir, onRequestClose}: ModalShellProps): ReactNode {
    // Build the iframe stylesheet list. Order matters for cascade — the
    // feature's own CSS comes last so it can override anything from the
    // shared/base layers.
    //
    // The host-vars stylesheet sets CSS variables that flow from the shell's
    // state into the iframe (which is otherwise CSS-isolated). `--ghost-accent-color`
    // is the canonical name themes already use; we mirror it here so feature
    // utilities like `gh:bg-[var(--ghost-accent-color)]` resolve correctly.
    const [styles] = useState<string[]>(() => {
        const hostVars = `:root { --ghost-accent-color: ${accentColor}; }`;
        const sheets = [BASE_MODAL_CSS, hostVars, sharedTailwindCss, sharedAnimationsCss];
        if (css) sheets.push(css);
        return sheets;
    });

    return (
        <ModalIframe styles={styles} title="Ghost" dir={dir} onEscape={onRequestClose}>
            <div className={cn('gh-modal-backdrop', backdropClass)} onClick={onRequestClose}>
                <div className={cn('gh-modal-panel', panelClass)} onClick={(e) => e.stopPropagation()}>
                    {content}
                </div>
            </div>
        </ModalIframe>
    );
}

/*
 * Base modal CSS for every iframe.
 *
 * Root font-size is intentionally left at the browser default (16px) so
 * Tailwind's spacing scale (`gh:h-11` = 44px, etc.) works as expected.
 * Feature CSS that needs portal's old 1rem=10px sizing should use explicit
 * px values via arbitrary classes (`gh:text-[15px]` rather than `text-[1.5rem]`).
 */
const BASE_MODAL_CSS = `
:root, html, body { box-sizing: border-box; }
html, body { height: 100%; margin: 0; overflow: hidden; }
*, *::before, *::after { box-sizing: inherit; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #15171a; font-size: 15px; line-height: 1.5; }

.gh-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 17, 21, 0.5);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 80px 24px 24px;
    animation: gh-modal-fadein 0.2s;
}

.gh-modal-panel {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
    max-width: 480px;
    width: 100%;
    padding: 24px;
    animation: gh-modal-popup 0.25s ease-in-out;
}

@keyframes gh-modal-fadein {
    0% { opacity: 0; }
    100% { opacity: 1; }
}

@keyframes gh-modal-popup {
    0% { transform: translateY(-30px); opacity: 0; }
    1% { transform: translateY(30px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}
`;
