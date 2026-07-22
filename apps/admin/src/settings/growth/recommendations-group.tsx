import { useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
    Button,
    NoValueLabel,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    TabsTriggerCount,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@tryghost/shade/components";
import { LucideIcon, formatNumber } from "@tryghost/shade/utils";
import {
    type IncomingRecommendation,
    type Recommendation,
    useBrowseIncomingRecommendations,
    useBrowseRecommendations,
} from "@tryghost/admin-x-framework/api/recommendations";
import { type ReferrerHistoryItem, useReferrerHistory } from "@tryghost/admin-x-framework/api/referrers";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useNavigate } from "@tryghost/admin-x-framework";

import { EditRecommendationDialog } from "./edit-recommendation-dialog";
import { RecommendationIcon } from "./recommendation-icon";
import { SettingGroup } from "@/settings/app/shared/setting-group";

/**
 * The Recommendations group, ported from the legacy growth/recommendations.tsx:
 * the outgoing list ("Your recommendations") and the incoming list
 * ("Recommending you") on shade Table rows, with the legacy 5-then-100
 * show-more pagination semantics.
 */

interface ShowMore {
    hasMore: boolean;
    loadMore: () => void;
}

// We first load 5, then load 100 at a time (= show all, but without using the dangerous 'all' limit)
function getNextPageParams(lastPage: { meta?: { pagination: { limit: number | string; page: number; pages: number } } }, otherParams: Record<string, string>) {
    if (!lastPage.meta) {
        return;
    }
    const { limit, page, pages } = lastPage.meta.pagination;
    if (page >= pages) {
        return;
    }

    const newPage = typeof limit === "number" && limit < 100 ? 1 : (page + 1);

    return {
        ...otherParams,
        page: newPage.toString(),
        limit: "100",
    };
}

function ShowMoreButton({ showMore }: { showMore: ShowMore }) {
    if (!showMore.hasMore) {
        return null;
    }
    return (
        <div className="pt-2">
            <Button className="px-0" size="sm" variant="link" onClick={() => showMore.loadMore()}>Show all</Button>
        </div>
    );
}

function RecommendationRow({ recommendation, onClick }: { recommendation: Recommendation; onClick: () => void }) {
    const isGhostSite = recommendation.one_click_subscribe;
    const showSubscribers = isGhostSite && !!recommendation.count?.subscribers;
    const count = (showSubscribers ? recommendation.count?.subscribers : recommendation.count?.clicks) || 0;
    const newMembers = count === 1 ? "signup" : "signups";
    const clicks = count === 1 ? "click" : "clicks";

    return (
        <TableRow className="hover:cursor-pointer" data-testid="recommendation-list-item" onClick={onClick}>
            <TableCell className="pl-0">
                <div className="flex items-center gap-3">
                    <RecommendationIcon favicon={recommendation.favicon} featuredImage={recommendation.featured_image} isGhostSite={isGhostSite} title={recommendation.title} />
                    <span className="line-clamp-1 font-medium">{recommendation.title}</span>
                </div>
            </TableCell>
            <TableCell className="whitespace-nowrap">
                {count === 0 ? (
                    <span className="text-muted-foreground">-</span>
                ) : (
                    <div className="flex items-center">
                        <span className="mr-2">{formatNumber(count)}</span>
                        <span className="text-muted-foreground lowercase">
                            <span>{showSubscribers ? newMembers : clicks}</span>
                            <span className="invisible group-hover:visible"> from you</span>
                        </span>
                    </div>
                )}
            </TableCell>
        </TableRow>
    );
}

function RecommendationList({ recommendations, showMore, isLoading }: {
    recommendations: Recommendation[];
    showMore: ShowMore;
    isLoading: boolean;
}) {
    const navigate = useNavigate();
    const { data: siteResponse } = useBrowseSite();
    const recommendationsURL = `${siteResponse?.site.url.replace(/\/$/, "")}/#/portal/recommendations`;

    const [copied, setCopied] = useState(false);
    const [editing, setEditing] = useState<Recommendation | null>(null);

    const copyRecommendationsUrl = () => {
        void navigator.clipboard.writeText(recommendationsURL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isLoading && !recommendations.length) {
        return (
            <NoValueLabel>
                <Button size="sm" variant="secondary" onClick={() => navigate("/settings/recommendations/add")}>Add first recommendation</Button>
                <span className="mt-2 max-w-[40ch] text-center text-sm">Need inspiration? <a className="text-primary" href="https://ghost.org/explore" rel="noopener noreferrer" target="_blank">Explore thousands of sites</a></span>
            </NoValueLabel>
        );
    }

    return (
        <div>
            <Table>
                <TableBody>
                    {recommendations.map((recommendation) => (
                        <RecommendationRow key={recommendation.id} recommendation={recommendation} onClick={() => setEditing(recommendation)} />
                    ))}
                </TableBody>
            </Table>
            <ShowMoreButton showMore={showMore} />
            <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <span>
                    Shared with new members after signup, or anytime using <a className="text-primary" href={recommendationsURL} rel="noopener noreferrer" target="_blank">this link</a>
                </span>
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button aria-label={copied ? "Copied" : "Copy"} className="cursor-pointer align-middle leading-none" type="button" onClick={copyRecommendationsUrl}>
                                {copied ? <LucideIcon.CircleCheck className="size-3.5 text-green" /> : <LucideIcon.Copy className="size-3.5 hover:opacity-80" />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>{copied ? "Copied" : "Copy link"}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            {editing && <EditRecommendationDialog recommendation={editing} onClose={() => setEditing(null)} />}
        </div>
    );
}

function IncomingRecommendationRow({ incomingRecommendation, stats }: {
    incomingRecommendation: IncomingRecommendation;
    stats: ReferrerHistoryItem[];
}) {
    const navigate = useNavigate();

    const signups = useMemo(() => {
        // Note: this should match the `getDomainFromUrl` method from OutboundLinkTagger
        let cleanedDomain = incomingRecommendation.url;
        try {
            cleanedDomain = new URL(incomingRecommendation.url).hostname.replace(/^www\./, "");
        } catch {
            // Ignore invalid urls
        }

        return stats.reduce((s, stat) => {
            if (stat.source === cleanedDomain) {
                return s + stat.signups;
            }
            return s;
        }, 0);
    }, [stats, incomingRecommendation.url]);

    const recommendBack = () => {
        navigate(`/settings/recommendations/add?url=${encodeURIComponent(incomingRecommendation.url)}`);
    };

    const showDetails = () => {
        window.open(incomingRecommendation.url, "_blank");
    };

    const freeMembersLabel = signups === 1 ? "free member" : "free members";

    return (
        <TableRow data-testid="incoming-recommendation-list-item">
            <TableCell className="cursor-pointer pl-0" onClick={showDetails}>
                <div className="flex items-center gap-3">
                    <RecommendationIcon favicon={incomingRecommendation.favicon} featuredImage={incomingRecommendation.featured_image} title={incomingRecommendation.title || incomingRecommendation.url} />
                    <span className="line-clamp-1 font-medium">{incomingRecommendation.title || incomingRecommendation.url}</span>
                </div>
            </TableCell>
            <TableCell className="cursor-pointer whitespace-nowrap" onClick={showDetails}>
                {signups === 0 ? (
                    <span className="text-muted-foreground">-</span>
                ) : (
                    <span>{formatNumber(signups)} <span className="text-muted-foreground lowercase">{freeMembersLabel}</span></span>
                )}
            </TableCell>
            <TableCell className="w-[1%] text-right whitespace-nowrap">
                {incomingRecommendation.recommending_back ? (
                    <span className="invisible whitespace-nowrap text-muted-foreground group-hover:visible">Recommending</span>
                ) : (
                    <Button className="px-0" size="sm" variant="link" onClick={recommendBack}>Recommend back</Button>
                )}
            </TableCell>
        </TableRow>
    );
}

function IncomingRecommendationList({ incomingRecommendations, stats, showMore, isLoading }: {
    incomingRecommendations: IncomingRecommendation[];
    stats: ReferrerHistoryItem[];
    showMore: ShowMore;
    isLoading: boolean;
}) {
    if (!isLoading && !incomingRecommendations.length) {
        return (
            <NoValueLabel>
                <span className="max-w-[40ch] text-center">No one&rsquo;s recommended you yet. Once they do, you&rsquo;ll find them here along with how many memberships they&rsquo;ve driven.</span>
            </NoValueLabel>
        );
    }

    return (
        <div>
            <Table>
                <TableBody>
                    {incomingRecommendations.map((rec) => (
                        <IncomingRecommendationRow key={rec.id} incomingRecommendation={rec} stats={stats} />
                    ))}
                </TableBody>
            </Table>
            <ShowMoreButton showMore={showMore} />
        </div>
    );
}

export function RecommendationsGroup({ keywords }: { keywords: string[] }) {
    const navigate = useNavigate();

    // Fetch "Your recommendations"
    const { data: { meta: recommendationsMeta, recommendations } = {}, isLoading: areRecommendationsLoading, hasNextPage, fetchNextPage } = useBrowseRecommendations({
        searchParams: {
            include: "count.clicks,count.subscribers",
            order: "created_at desc",
            limit: "5",
        },
        getNextPageParams,
        placeholderData: keepPreviousData,
    });

    const showMoreRecommendations: ShowMore = {
        hasMore: !!hasNextPage,
        loadMore: () => void fetchNextPage(),
    };

    // Fetch "Recommending you", including stats
    const { data: { recommendations: incomingRecommendations, meta: incomingRecommendationsMeta } = {}, isLoading: areIncomingRecommendationsLoading, hasNextPage: hasIncomingRecommendationsNextPage, fetchNextPage: fetchIncomingRecommendationsNextPage } = useBrowseIncomingRecommendations({
        searchParams: {
            limit: "5",
            order: "created_at desc",
        },
        getNextPageParams,
        placeholderData: keepPreviousData,
    });

    const { data: { stats } = {}, isLoading: areStatsLoading } = useReferrerHistory({});

    const showMoreMentions: ShowMore = {
        hasMore: !!hasIncomingRecommendationsNextPage,
        loadMore: () => void fetchIncomingRecommendationsNextPage(),
    };

    const [selectedTab, setSelectedTab] = useState("your-recommendations");

    return (
        <SettingGroup
            customButtons={(
                <Button size="sm" variant="ghost" onClick={() => navigate("/settings/recommendations/add")}>Add recommendation</Button>
            )}
            description="Recommend any publication that your audience will find valuable, and find out when others are recommending you."
            keywords={keywords}
            navid="recommendations"
            testId="recommendations"
            title={<span className="inline-flex items-start gap-1">Recommendations <sup className="text-[10px] font-semibold tracking-wide uppercase">Beta</sup></span>}
        >
            <Tabs value={selectedTab} variant="underline" onValueChange={setSelectedTab}>
                <TabsList>
                    <TabsTrigger value="your-recommendations">
                        Your recommendations
                        {typeof recommendationsMeta?.pagination?.total === "number" && <TabsTriggerCount>{formatNumber(recommendationsMeta.pagination.total)}</TabsTriggerCount>}
                    </TabsTrigger>
                    <TabsTrigger value="recommending-you">
                        Recommending you
                        {typeof incomingRecommendationsMeta?.pagination?.total === "number" && <TabsTriggerCount>{formatNumber(incomingRecommendationsMeta.pagination.total)}</TabsTriggerCount>}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="your-recommendations">
                    <RecommendationList isLoading={areRecommendationsLoading} recommendations={recommendations ?? []} showMore={showMoreRecommendations} />
                </TabsContent>
                <TabsContent value="recommending-you">
                    <IncomingRecommendationList incomingRecommendations={incomingRecommendations ?? []} isLoading={areIncomingRecommendationsLoading || areStatsLoading} showMore={showMoreMentions} stats={stats ?? []} />
                </TabsContent>
            </Tabs>
        </SettingGroup>
    );
}
