import { type ReactNode, useState } from "react";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@tryghost/shade/components";
import { blobDownloadFromEndpoint } from "@tryghost/admin-x-framework/helpers";
import { downloadAllContent } from "@tryghost/admin-x-framework/api/db";
import { useNavigate } from "@tryghost/admin-x-framework";

import { IntegrationIcon, type IntegrationIconName } from "./integration-icon";
import { UniversalImportDialog } from "./universal-import-dialog";
import { SettingGroup } from "@/settings/app/shared/setting-group";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The Migration tools group, ported from the legacy
 * advanced/migration-tools.tsx: Import tab (external migrator apps +
 * Universal import) and Export tab (content & settings download, post
 * analytics CSV export).
 */

function GridButton({ icon, title, testId, disabled, loading, onClick }: {
    icon: ReactNode;
    title: string;
    testId?: string;
    disabled?: boolean;
    loading?: boolean;
    onClick: () => void;
}) {
    return (
        <Button className="h-9 justify-center font-semibold" data-testid={testId} disabled={disabled} variant="secondary" onClick={onClick}>
            {icon}
            {title}
            {loading && <span className="sr-only">Loading...</span>}
        </Button>
    );
}

const MIGRATORS: Array<{ icon: IntegrationIconName; title: string; route: string; iconSize?: number }> = [
    { icon: "substack", title: "Substack", route: "/migrate/substack" },
    { icon: "beehiiv", title: "beehiiv", route: "/migrate/beehiiv" },
    { icon: "wordpress", title: "WordPress", route: "/migrate/wordpress" },
    { icon: "squarespace", title: "Squarespace", route: "/migrate/squarespace" },
    { icon: "medium", title: "Medium", route: "/migrate/medium" },
    { icon: "mailchimp", title: "Mailchimp", route: "/migrate/mailchimp", iconSize: 20 },
];

export function MigrationToolsGroup({ keywords }: { keywords: string[] }) {
    const navigate = useNavigate();
    const handleError = useSettingsHandleError();
    const [selectedTab, setSelectedTab] = useState<"import" | "export">("import");
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isExportingPosts, setIsExportingPosts] = useState(false);

    const exportPosts = async () => {
        if (isExportingPosts) {
            return;
        }

        setIsExportingPosts(true);

        try {
            await blobDownloadFromEndpoint("/posts/export/?limit=1000", "posts.analytics.csv");
        } catch (e) {
            handleError(e);
        } finally {
            setIsExportingPosts(false);
        }
    };

    return (
        <SettingGroup
            description="Import content, members and subscriptions from other platforms or export your Ghost data."
            keywords={keywords}
            navid="migration"
            testId="migrationtools"
            title="Migration tools"
        >
            <Tabs value={selectedTab} variant="underline" onValueChange={(value) => setSelectedTab(value as typeof selectedTab)}>
                <TabsList>
                    <TabsTrigger value="import">Import</TabsTrigger>
                    <TabsTrigger value="export">Export</TabsTrigger>
                </TabsList>
                <TabsContent value="import">
                    <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3">
                        {MIGRATORS.map((migrator) => (
                            <GridButton
                                key={migrator.title}
                                icon={<IntegrationIcon className="w-auto" name={migrator.icon} size={migrator.iconSize ?? 18} />}
                                title={migrator.title}
                                onClick={() => navigate(migrator.route, { crossApp: true })}
                            />
                        ))}
                        <GridButton
                            icon={<IntegrationIcon className="w-auto" name="import" size={16} />}
                            title="Universal import"
                            onClick={() => setIsImportOpen(true)}
                        />
                    </div>
                </TabsContent>
                <TabsContent value="export">
                    <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3">
                        <GridButton
                            icon={<IntegrationIcon className="h-4 w-auto" name="export" size={16} />}
                            title="Content & settings"
                            onClick={() => downloadAllContent()}
                        />
                        <GridButton
                            disabled={isExportingPosts}
                            icon={<IntegrationIcon className="h-4 w-auto" name="baseline-chart" size={16} />}
                            loading={isExportingPosts}
                            testId="post-analytics-export-button"
                            title="Post analytics"
                            onClick={() => void exportPosts()}
                        />
                    </div>
                </TabsContent>
            </Tabs>
            {isImportOpen && <UniversalImportDialog onClose={() => setIsImportOpen(false)} />}
        </SettingGroup>
    );
}
