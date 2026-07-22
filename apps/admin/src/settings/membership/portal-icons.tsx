import { type SVGProps } from "react";

/**
 * The five built-in Portal button icons, inlined from the legacy
 * admin-x-design-system icon set (they draw with currentColor, so inline SVG
 * keeps them theme-aware without an svgr pipeline).
 */

function PortalIcon1(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" height="24" viewBox="0 0 21 24" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M10.533 11.267a5.135 5.135 0 1 0-.001-10.27 5.135 5.135 0 0 0 .001 10.27zM1 23a9.531 9.531 0 0 1 16.274-6.741 9.532 9.532 0 0 1 2.793 6.74" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
    );
}

function PortalIcon2(props: SVGProps<SVGSVGElement>) {
    return (
        <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M12.5 2v20M2 12.5h20" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        </svg>
    );
}

function PortalIcon3(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" height="24" viewBox="0 0 25 24" width="25" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M23.5 6v14.25a2.25 2.25 0 1 1-4.5 0V3c0-.398-.158-.78-.44-1.06a1.494 1.494 0 0 0-1.06-.44h-15c-.398 0-.78.158-1.06.44C1.157 2.22 1 2.601 1 3v17.25a2.25 2.25 0 0 0 2.25 2.25h18M4.75 15h10.5m-10.5 3h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            <path d="M14.5 5.25h-9a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h9a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
    );
}

function PortalIcon4(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" height="18" viewBox="0 0 24 18" width="24" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M21.75 1.5H2.25A1.5 1.5 0 0 0 .75 3v12a1.5 1.5 0 0 0 1.5 1.5h19.5a1.5 1.5 0 0 0 1.5-1.5V3a1.5 1.5 0 0 0-1.5-1.5zm-6.063 5.475L19.5 10.5M8.313 6.975 4.5 10.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            <path d="m22.88 2.014-9.513 6.56a2.41 2.41 0 0 1-2.734 0L1.12 2.014" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
    );
}

function PortalIcon5(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" height="26" viewBox="0 0 26 26" width="26" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M17.903 12.016a5.007 5.007 0 0 0-3.031-3.654m-3.835.038a5.002 5.002 0 0 0-2.879 5.85m2.282 3.046A4.975 4.975 0 0 0 13 18a4.99 4.99 0 0 0 4.12-2.167m-1.949 5.387a8.504 8.504 0 0 0 5.756-11.295m-2.316-3.31A8.474 8.474 0 0 0 13 4.5a8.461 8.461 0 0 0-5.608 2.113m-2.28 3.213a8.503 8.503 0 0 0 5.914 11.444" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
            <path d="M8.924 24.29c1.273.46 2.645.71 4.076.71 5.52 0 10.17-3.727 11.57-8.803M6.712 2.777A11.994 11.994 0 0 0 1 13c0 3.545 1.537 6.731 3.982 8.928m19.867-10.839C23.933 5.369 18.977 1 13 1c-.69 0-1.367.058-2.025.17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        </svg>
    );
}

const PORTAL_ICONS: Record<string, React.ComponentType<SVGProps<SVGSVGElement>>> = {
    "icon-1": PortalIcon1,
    "icon-2": PortalIcon2,
    "icon-3": PortalIcon3,
    "icon-4": PortalIcon4,
    "icon-5": PortalIcon5,
};

export function PortalButtonIcon({ icon, ...props }: { icon: string } & SVGProps<SVGSVGElement>) {
    const IconComponent = PORTAL_ICONS[icon] || PortalIcon1;
    return <IconComponent {...props} />;
}
