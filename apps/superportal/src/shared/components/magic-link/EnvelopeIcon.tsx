import type {ReactElement} from 'react';

interface Props {
    className?: string;
}

/**
 * Envelope icon — used in the magic-link "Now check your email!" header
 * and as the fallback icon for inbox-link providers without a brand SVG.
 *
 * Path verbatim from `apps/portal/src/images/icons/envelope.svg` (Lucide mail).
 */
export function EnvelopeIcon({className}: Props): ReactElement {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
            <rect x="2" y="4" width="20" height="16" rx="2" />
        </svg>
    );
}
