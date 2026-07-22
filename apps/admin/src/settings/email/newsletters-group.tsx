import { useState } from "react";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@tryghost/shade/components";
import { formatNumber } from "@tryghost/shade/utils";
import { useNavigate } from "@tryghost/admin-x-framework";

import { NewslettersList } from "./newsletters-list";
import { useNewsletters } from "./use-newsletters";
import { useNewsletterVerification } from "./use-newsletter-verification";
import { SettingGroup } from "@/settings/app/shared/setting-group";

/**
 * The Newsletters group (automations flag off), ported from the legacy
 * email/newsletters.tsx: active/archived tabs over the shared list, the
 * add-newsletter entry point and the verification-token flow.
 */
export function NewslettersGroup({ keywords }: { keywords: string[] }) {
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState("active-newsletters");
    const { newsletters, sortedActiveNewsletters, archivedNewsletters, meta, isEnd, isLoading, fetchNextPage, onSort } = useNewsletters();

    useNewsletterVerification();

    return (
        <SettingGroup
            customButtons={(
                <Button className="mt-[-5px]" size="sm" variant="ghost" onClick={() => navigate("/settings/newsletters/new")}>
                    Add newsletter
                </Button>
            )}
            description="Edit details and customize your design"
            keywords={keywords}
            navid="newsletters"
            testId="newsletters"
            title="Newsletters"
        >
            <Tabs value={selectedTab} variant="underline" onValueChange={setSelectedTab}>
                <TabsList>
                    <TabsTrigger value="active-newsletters">Active</TabsTrigger>
                    <TabsTrigger value="archived-newsletters">Archived</TabsTrigger>
                </TabsList>
                <TabsContent value="active-newsletters">
                    <NewslettersList isLoading={isLoading} newsletters={sortedActiveNewsletters} isSortable onSort={onSort} />
                </TabsContent>
                <TabsContent value="archived-newsletters">
                    <NewslettersList isLoading={isLoading} newsletters={archivedNewsletters} />
                </TabsContent>
            </Tabs>
            {isEnd === false && (
                <Button className="self-start px-0" variant="ghost" onClick={() => void fetchNextPage()}>
                    {`Load more (showing ${formatNumber(newsletters?.length || 0)}/${formatNumber(meta?.pagination.total || 0)} newsletters)`}
                </Button>
            )}
        </SettingGroup>
    );
}
