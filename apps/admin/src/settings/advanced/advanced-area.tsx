import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";

import { CodeInjectionGroup } from "./code-injection-group";
import { DangerZoneGroup } from "./danger-zone-group";
import { HistoryGroup } from "./history-group";
import { IntegrationsGroup } from "./integrations-group";
import { LabsGroup } from "./labs-group";
import { MigrationToolsGroup } from "./migration-tools-group";
import { advancedKeywords } from "@/settings/app/nav";

/**
 * The Advanced settings area, rebuilt natively: the same groups in the same
 * order as the legacy advanced-settings.tsx (spam filters renders in the
 * Membership area, exactly like the legacy membership composition). Waits
 * for the settings/config responses so every group starts from real
 * settings.
 */
export function AdvancedArea() {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();

    if (!settingsData || !configData) {
        return null;
    }

    return (
        <div className="flex flex-col gap-9">
            <IntegrationsGroup keywords={advancedKeywords.integrations} />
            <MigrationToolsGroup keywords={advancedKeywords.migrationtools} />
            <CodeInjectionGroup keywords={advancedKeywords.codeInjection} />
            <LabsGroup keywords={advancedKeywords.labs} />
            <HistoryGroup keywords={advancedKeywords.history} />
            <DangerZoneGroup keywords={advancedKeywords.dangerzone} />
        </div>
    );
}
