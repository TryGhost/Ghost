import { useState } from "react";

import ghostLogo from "./assets/ghost-favicon.png";

/**
 * The favicon/feature-image thumbnail for a recommendation row, ported from
 * the legacy recommendations/recommendation-icon.tsx (Ghost sites get the
 * one-click-subscribe badge).
 */
export function RecommendationIcon({ title, favicon, featuredImage, isGhostSite }: {
    title: string;
    favicon?: string | null;
    featuredImage?: string | null;
    isGhostSite?: boolean;
}) {
    const [icon, setIcon] = useState(favicon || featuredImage || null);

    const clearIcon = () => {
        setIcon(null);
    };

    if (!icon) {
        return <div className="relative size-6 shrink-0 rounded-sm" />;
    }

    const hint = isGhostSite ? "This is a Ghost site that supports one-click subscribe" : "";

    return (
        <div className="relative size-6 shrink-0 rounded-sm" title={hint}>
            <img alt={title} className="size-6 rounded-sm" src={icon} onError={clearIcon} />
            {isGhostSite && <img alt="Ghost Logo" className="absolute right-[-3px] bottom-[-3px] size-[14px]" src={ghostLogo} />}
        </div>
    );
}
