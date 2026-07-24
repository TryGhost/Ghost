import { cn } from "@tryghost/shade/utils";

import angleBrackets from "./assets/icons/angle-brackets.svg?raw";
import baselineChart from "./assets/icons/baseline-chart.svg?raw";
import beehiiv from "./assets/icons/beehiiv.svg?raw";
import exportIcon from "./assets/icons/export.svg?raw";
import firstpromoter from "./assets/icons/firstpromoter.svg?raw";
import importIcon from "./assets/icons/import.svg?raw";
import integration from "./assets/icons/integration.svg?raw";
import mailchimp from "./assets/icons/mailchimp.svg?raw";
import medium from "./assets/icons/medium.svg?raw";
import pintura from "./assets/icons/pintura.svg?raw";
import slack from "./assets/icons/slack.svg?raw";
import squarespace from "./assets/icons/squarespace.svg?raw";
import substack from "./assets/icons/substack.svg?raw";
import transistor from "./assets/icons/transistor.svg?raw";
import unsplash from "./assets/icons/unsplash.svg?raw";
import wordpress from "./assets/icons/wordpress.svg?raw";
import zapier from "./assets/icons/zapier.svg?raw";

/**
 * The integration/migrator logo SVGs, copied from the legacy design system's
 * icon assets and inlined at build time (`?raw`) — lucide-react ships no
 * brand icons, and inlining keeps the currentColor-based marks (unsplash,
 * transistor, medium, the line icons) theme-aware without `dark:` variants.
 */

const ICONS = {
    "angle-brackets": angleBrackets,
    "baseline-chart": baselineChart,
    beehiiv,
    export: exportIcon,
    firstpromoter,
    import: importIcon,
    integration,
    mailchimp,
    medium,
    pintura,
    slack,
    squarespace,
    substack,
    transistor,
    unsplash,
    wordpress,
    zapier,
} as const;

export type IntegrationIconName = keyof typeof ICONS;

export interface IntegrationIconProps {
    name: IntegrationIconName;
    /** Pixel width & height (the legacy Icon size contract). */
    size?: number;
    className?: string;
}

export function IntegrationIcon({ name, size = 32, className }: IntegrationIconProps) {
    return (
        <span
            aria-hidden="true"
            className={cn("pointer-events-none inline-block shrink-0 [&_svg]:h-full [&_svg]:w-full", className)}
            // The sources are our own static build-time assets, not user input.
            dangerouslySetInnerHTML={{ __html: ICONS[name] }}
            style={{ width: `${size}px`, height: `${size}px` }}
        />
    );
}
