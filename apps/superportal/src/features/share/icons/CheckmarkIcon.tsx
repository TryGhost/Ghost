import type {ReactElement} from 'react';

interface Props {
    className?: string;
}

/**
 * Checkmark for the copy-success state. Stroke uses currentColor so callers
 * can tint via className (`gh:text-[brandcolor]`).
 */
export function CheckmarkIcon({className}: Props): ReactElement {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 15 14"
            fill="none"
            aria-hidden="true"
            focusable="false"
            className={className}
        >
            <path
                d="M1 6.89286L6.10714 12L13.9643 1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
