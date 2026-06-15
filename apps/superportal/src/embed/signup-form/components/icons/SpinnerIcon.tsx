import type {ReactElement, SVGProps} from 'react';

/**
 * Animated three-dot loading indicator — inlined from assets/icons/spinner.svg
 * in the original signup-form app to avoid a dependency on vite-plugin-svgr.
 */
export function SpinnerIcon(props: SVGProps<SVGSVGElement>): ReactElement {
    return (
        <svg
            aria-busy="true"
            aria-live="polite"
            height="24"
            viewBox="0 0 24 24"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <g className="nc-icon-wrapper" fill="currentColor" stroke="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                <g className="nc-loop-dots-4-24-icon-o">
                    <circle cx="4" cy="12" r="3" />
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="20" cy="12" r="3" />
                </g>
                <style>{`
                    .nc-loop-dots-4-24-icon-o{--animation-duration:0.8s}
                    .nc-loop-dots-4-24-icon-o *{opacity:.4;transform:scale(.75);animation:nc-loop-dots-4-anim var(--animation-duration) infinite}
                    .nc-loop-dots-4-24-icon-o :nth-child(1){transform-origin:4px 12px;animation-delay:calc(var(--animation-duration)/-2.666)}
                    .nc-loop-dots-4-24-icon-o :nth-child(2){transform-origin:12px 12px;animation-delay:calc(var(--animation-duration)/-5.333)}
                    .nc-loop-dots-4-24-icon-o :nth-child(3){transform-origin:20px 12px}
                    @keyframes nc-loop-dots-4-anim{0%,100%{opacity:.4;transform:scale(.75)}50%{opacity:1;transform:scale(1)}}
                `}</style>
            </g>
        </svg>
    );
}
