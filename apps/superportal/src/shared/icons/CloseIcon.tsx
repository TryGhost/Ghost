import type {ReactElement} from 'react';

interface Props {
    className?: string;
}

/**
 * Modal-header close icon. Thin two-stroke X, 24×24 viewBox, currentColor
 * stroke. Sized by callers via Tailwind utilities (e.g., `gh:h-5 gh:w-5`).
 *
 * Used by: share, gift, members (auth), search modals. The bar's bold-filled
 * close icon (announcement/CloseIcon.tsx) is a different glyph for a different
 * UI surface and stays separate.
 *
 * Verbatim from apps/portal/src/images/icons/close.svg.
 */
export function CloseIcon({className}: Props): ReactElement {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            focusable="false"
            className={className}
        >
            <path
                d="M.75 23.249l22.5-22.5M23.25 23.249L.75.749"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.2"
            />
        </svg>
    );
}
