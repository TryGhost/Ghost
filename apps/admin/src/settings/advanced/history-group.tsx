import { Button } from "@tryghost/shade/components";
import { useNavigate } from "@tryghost/admin-x-framework";

import { SettingGroup } from "@/settings/app/shared/setting-group";

/** The History group, ported from the legacy advanced/history.tsx: a View history button for the routed audit-log dialog. */
export function HistoryGroup({ keywords }: { keywords: string[] }) {
    const navigate = useNavigate();

    return (
        <SettingGroup
            customButtons={<Button size="sm" variant="ghost" onClick={() => navigate("/settings/history/view")}>View history</Button>}
            description="View system event log"
            keywords={keywords}
            navid="history"
            testId="history"
            title="History"
        />
    );
}
