import { useState } from "react";

import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The legacy integration-modal Save button dance: "Save" → "Saving..." (at
 * least a second) → "Saved" (a second) → "Save", with errors routed through
 * the settings error handler.
 */
export function useSaveLabel() {
    const [label, setLabel] = useState("Save");
    const handleError = useSettingsHandleError();

    const run = async (action: () => Promise<unknown>) => {
        try {
            setLabel("Saving...");
            await Promise.all([
                action(),
                new Promise((resolve) => {
                    setTimeout(resolve, 1000);
                }),
            ]);
            setLabel("Saved");
        } catch (error) {
            handleError(error);
        } finally {
            setTimeout(() => setLabel("Save"), 1000);
        }
    };

    return { label, run, colorClass: label === "Saved" ? "bg-state-success hover:bg-state-success" : undefined };
}
