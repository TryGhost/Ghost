import type {ReactElement, SVGProps} from 'react';

/**
 * Envelope / email icon — inlined from assets/icons/email.svg in the original
 * signup-form app to avoid a dependency on vite-plugin-svgr.
 */
export function EmailIcon(props: SVGProps<SVGSVGElement>): ReactElement {
    return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
            <defs>
                <style>{'.sf-email-a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1px;}'}</style>
            </defs>
            <rect className="sf-email-a" height="15" rx="1.5" ry="1.5" width="22.5" x="0.75" y="4.5" />
            <line className="sf-email-a" x1="15.687" x2="19.5" y1="9.975" y2="13.5" />
            <line className="sf-email-a" x1="8.313" x2="4.5" y1="9.975" y2="13.5" />
            <path className="sf-email-a" d="M22.88,5.014l-9.513,6.56a2.406,2.406,0,0,1-2.734,0L1.12,5.014" />
        </svg>
    );
}
