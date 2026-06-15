import type {ReactElement} from 'react';

/**
 * Close icon rendered inside the announcement bar's dismiss button.
 *
 * 10x10 (matches legacy `apps/announcement-bar/src/icons/clear.svg`).
 * fill="currentColor" so it inherits the parent button's text colour.
 */
export function CloseIcon(): ReactElement {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="10"
            height="10"
            aria-hidden="true"
            focusable="false"
        >
            <path
                d="M.44,21.44a1.49,1.49,0,0,0,0,2.12,1.5,1.5,0,0,0,2.12,0l9.26-9.26a.25.25,0,0,1,.36,0l9.26,9.26a1.5,1.5,0,0,0,2.12,0,1.49,1.49,0,0,0,0-2.12L14.3,12.18a.25.25,0,0,1,0-.36l9.26-9.26A1.5,1.5,0,0,0,21.44.44L12.18,9.7a.25.25,0,0,1-.36,0L2.56.44A1.5,1.5,0,0,0,.44,2.56L9.7,11.82a.25.25,0,0,1,0,.36Z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth=".4"
                fill="currentColor"
            />
        </svg>
    );
}
