import { useState } from "react";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@tryghost/shade/components";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

import labsBubblesImage from "./assets/labs-bg.svg";
import { BetaFeatures } from "./beta-features";
import { PrivateFeatures } from "./private-features";
import { SettingGroup } from "@/settings/app/shared/setting-group";

/**
 * The Labs group, ported from the legacy advanced/labs.tsx: closed shows the
 * bubbles illustration, open shows the Beta features tab (plus Private
 * features under developer experiments). The legacy auto-expand on a single
 * search hit isn't ported (no per-component search registration in the
 * native chrome yet).
 */

type LabsTab = "labs-private-features" | "labs-beta-features";

export function LabsGroup({ keywords }: { keywords: string[] }) {
    const [selectedTab, setSelectedTab] = useState<LabsTab>("labs-beta-features");
    const [isOpen, setIsOpen] = useState(false);
    const { data: configData } = useBrowseConfig();
    const enableDeveloperExperiments = Boolean(configData?.config?.enableDeveloperExperiments);

    return (
        <SettingGroup
            customButtons={(
                <Button size="sm" variant={isOpen ? "secondary" : "ghost"} onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? "Close" : "Open"}
                </Button>
            )}
            description="This is a testing ground for new or experimental features. They may change, break or inexplicably disappear at any time."
            keywords={keywords}
            navid="labs"
            testId="labs"
            title="Labs"
        >
            {isOpen ? (
                <Tabs value={selectedTab} variant="underline" onValueChange={(value) => setSelectedTab(value as LabsTab)}>
                    <TabsList>
                        <TabsTrigger value="labs-beta-features">Beta features</TabsTrigger>
                        {enableDeveloperExperiments && <TabsTrigger value="labs-private-features">Private features</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="labs-beta-features"><BetaFeatures /></TabsContent>
                    {enableDeveloperExperiments && <TabsContent value="labs-private-features"><PrivateFeatures /></TabsContent>}
                </Tabs>
            ) : (
                <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl opacity-70">
                    <img alt="" className="absolute -top-6 -right-6" src={labsBubblesImage} />
                </div>
            )}
        </SettingGroup>
    );
}
