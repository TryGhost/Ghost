import { type ComponentType } from "react";

import { type SettingsAreaSection } from "./nav";
import { useSettingsSearch } from "./use-settings-search";

/**
 * One settings area in the main scroll pane. Every area is rebuilt natively
 * and registers its component in AREA_COMPONENTS (settings-shell.tsx).
 * Sections hide while a search filter excludes them, but stay visible in
 * the nothing-matched state — the same contract as the legacy
 * SearchableSection.
 */
export interface AreaSectionProps {
    area: SettingsAreaSection;
    Component: ComponentType;
}

export function AreaSection({ area, Component }: AreaSectionProps) {
    const { checkVisible, noResult } = useSettingsSearch();
    // Hide (don't unmount) while filtered out — the legacy sections stay in
    // the DOM with their groups, which the search suite asserts on.
    const isVisible = checkVisible(area.keywords) || noResult;

    return (
        <section className={isVisible ? "scroll-mt-16" : "hidden"} data-testid={`settings-area-${area.id}`} id={`settings-area-${area.id}`}>
            <h2 className="mb-4 text-xl font-semibold tracking-tight">{area.title}</h2>
            <Component />
        </section>
    );
}
