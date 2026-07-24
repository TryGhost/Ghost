import { useEffect, useRef, useState } from "react";

import { useSettingsSearch } from "@/settings/app/use-settings-search";

/**
 * Auto-expands a group while it's the only search result, respecting manual
 * control until the filter clears — the legacy use-auto-expandable hook on
 * the native search service (used by the Labs group).
 */
export function useAutoExpandable(keywords: string[]) {
    const [isOpen, setIsOpen] = useState(false);
    const wasManuallyControlled = useRef(false);
    const { filter, getVisibleComponents, checkVisible } = useSettingsSearch();

    useEffect(() => {
        if (!filter) {
            wasManuallyControlled.current = false;
        }
    }, [filter]);

    useEffect(() => {
        if (wasManuallyControlled.current) {
            return;
        }

        const isVisible = checkVisible(keywords);
        const visibleComponents = getVisibleComponents();
        const shouldAutoOpen = !!filter && isVisible && visibleComponents.size === 1;

        setIsOpen(shouldAutoOpen);
    }, [filter, keywords, checkVisible, getVisibleComponents]);

    const openManually = () => {
        wasManuallyControlled.current = true;
        setIsOpen(true);
    };

    const closeManually = () => {
        wasManuallyControlled.current = true;
        setIsOpen(false);
    };

    return { isOpen, openManually, closeManually };
}
