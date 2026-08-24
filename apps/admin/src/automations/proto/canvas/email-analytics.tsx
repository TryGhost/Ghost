import React from 'react';
import type {AutomationEmailStats} from '@tryghost/admin-x-framework/api/automations';
import {Button, type ChartConfig, ChartContainer, DataList, DataListBar, DataListBody, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {Box, Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon, Recharts, cn, formatNumber, formatPercentage} from '@tryghost/shade/utils';
import {type ProtoActionLink, actionLinks} from '@/automations/proto/shared/email-links';
import {formatRate} from '@/automations/components/canvas/format-stats';
import {OffValue} from '@/automations/components/canvas/off-value';

// Email analytics for the proto's canvas — hybrid with the real editor.
//
// Reuses the shipped editor's shared, presentational bits verbatim (OffValue,
// formatRate) and the same Shade chart/recharts building blocks, but is
// proto-owned and driven by each email's own `action.stats`, so numbers vary per
// email and stay consistent between the node footer and the sidebar. Mirrors
// apps/admin/src/automations/components/canvas (EmailStepStatsFooter +
// email-performance-section). Kept thin: no /members links, hover-swaps, or the
// "Top clicked links" list (those need invented URLs) — easy to add later.

interface StatsProps {
    stats: AutomationEmailStats;
    opensTracked?: boolean;
    clicksTracked?: boolean;
}

// --- Node stats footer -----------------------------------------------------

// Tracked → the value; not tracked → a muted, inert "Off" that keeps the column
// in place (distinct from formatRate's "--" = no data yet).
const FooterMetric: React.FC<{label: string; tracked: boolean; children: React.ReactNode}> = ({label, tracked, children}) => (
    <div className="flex flex-col gap-1 text-left">
        {/* Small muted label; value at 14px (text-md) foreground. */}
        <span className="text-xs text-muted-foreground">{label}</span>
        {tracked
            ? <span className="text-md text-foreground tabular-nums">{children}</span>
            : <OffValue className="text-md" />}
    </div>
);

export const EmailStatsFooter: React.FC<StatsProps & {divider?: boolean}> = ({stats, opensTracked = true, clicksTracked = true, divider = true}) => (
    // divider (read canvas): border-t separating stats from the header above. Without
    // it (email preview) the border goes and the spacing belongs to the wrapping
    // analytics button instead — it pads evenly so its hover fill clears the stats
    // on every side, then pulls the padding back with negative margins so the grid
    // sits exactly where a bare mt-[24px] used to put it.
    <div className={cn('grid w-full grid-cols-3 gap-3', divider && 'mt-3 border-t border-border-default pt-3')}>
        <FooterMetric label="Sent" tracked={true}>{formatNumber(stats.email_sent_count)}</FooterMetric>
        <FooterMetric label="Opened" tracked={opensTracked}>{formatRate(stats.opened_rate)}</FooterMetric>
        <FooterMetric label="Clicked" tracked={clicksTracked}>{formatRate(stats.clicked_rate)}</FooterMetric>
    </div>
);

// --- Inline node analytics (future concept) ---------------------------------

// One stacked bar of the sent audience, plus a legend, in place of the sheet's
// nested rings. The rings never said anything the numbers didn't, and a 400px card
// has width to spare and no height to waste.
//
// The segments are a breakdown of one population rather than three separate
// measures: everyone sent to, split into those who never opened, those who opened,
// and those who clicked. That's why it's one track — the widths are parts of a
// whole, which is exactly what a stacked bar is for and what three separate bars
// would have obscured.
const RATE_LEGEND = [
    {key: 'sent', label: 'Sent', color: 'var(--chart-gray)'},
    {key: 'opened', label: 'Opened', color: 'var(--chart-2)'},
    {key: 'clicked', label: 'Clicked', color: 'var(--chart-1)'}
] as const;

const pct = (rate: number): number => Math.round(Math.min(Math.max(rate, 0), 1) * 100);

export const EmailStatsInline: React.FC<StatsProps & {
    actionId: string;
    linksOpen: boolean;
    onToggleLinks: () => void;
}> = ({stats, opensTracked = true, clicksTracked = true, actionId, linksOpen, onToggleLinks}) => {
    const openRate = (stats.opened_rate ?? 0) / 100;
    const clickRate = (stats.clicked_rate ?? 0) / 100;
    const openedPct = opensTracked ? pct(openRate) : 0;
    const clickedPct = clicksTracked ? pct(clickRate) : 0;
    // Clicked is a subset of opened, so its width comes out of the opened segment
    // rather than being added beside it — otherwise the bar would overrun 100%.
    const openedOnlyPct = Math.max(openedPct - clickedPct, 0);
    const links = actionLinks(actionId, stats.email_clicked_count);
    return (
        <Stack className="mt-4" gap="sm">
            {/* The chevron only appears on card hover: at rest the numbers are the
                point, and a collapse control sitting there permanently competed with
                them. Focus-visible keeps it reachable by keyboard. */}
            <Inline align="center" justify="between">
                {/* Same size and weight as the bare subject above it, so the card
                    reads as two sections of equal standing rather than a heading
                    with a caption under it. */}
                <Text size="md" weight="semibold">Performance</Text>
                {clicksTracked && (
                    <Button
                        aria-expanded={linksOpen}
                        aria-label={linksOpen ? 'Hide top clicked links' : 'Show top clicked links'}
                        className="-my-2 opacity-0 transition-opacity group-hover/node:opacity-100 focus-visible:opacity-100"
                        size="icon"
                        variant="ghost"
                        onClick={onToggleLinks}
                    >
                        <LucideIcon.ChevronDown className={cn('transition-transform', linksOpen && 'rotate-180')} />
                    </Button>
                )}
            </Inline>
            <div className="flex h-2 w-full overflow-hidden rounded-full" style={{backgroundColor: 'var(--chart-gray)'}}>
                <div style={{width: `${openedOnlyPct}%`, backgroundColor: 'var(--chart-2)'}} />
                <div style={{width: `${clickedPct}%`, backgroundColor: 'var(--chart-1)'}} />
            </div>
            {/* Value rides with its label — "Opened 44%" reads as one fact, where a
                separate column would make the eye pair them up. */}
            <Inline align="center" className="flex-wrap" gap="md">
                {RATE_LEGEND.map((entry) => {
                    const tracked = entry.key === 'opened' ? opensTracked : entry.key === 'clicked' ? clicksTracked : true;
                    return (
                        <Inline key={entry.key} align="center" gap="xs">
                            <span className="size-2 shrink-0 rounded-full" style={{backgroundColor: entry.color}} />
                            <Text size="sm" tone="secondary">{entry.label}</Text>
                            {tracked
                                ? <Text size="sm" weight="medium">{entry.key === 'sent' ? formatNumber(stats.email_sent_count) : formatPercentage(entry.key === 'opened' ? openRate : clickRate)}</Text>
                                : <OffValue className="text-sm" />}
                        </Inline>
                    );
                })}
            </Inline>
            {/* Titled rather than ruled off. The heading is what separates it from
                the bar above — a divider as well would be two devices doing one
                job. Weight sits below Performance's: this is a section within it,
                not a peer of it. */}
            {linksOpen && clicksTracked && (
                <Stack className="mt-2" gap="sm">
                    <Inline align="center" justify="between">
                        <Text size="sm" tone="secondary" weight="medium">Top clicked links</Text>
                        <Text size="sm" tone="tertiary" weight="medium">Members</Text>
                    </Inline>
                    <TopClickedLinksContent
                        clickedCount={stats.email_clicked_count}
                        links={links}
                        sentCount={stats.email_sent_count}
                    />
                </Stack>
            )}
        </Stack>
    );
};

// --- Sidebar performance section -------------------------------------------

const RING_CHART_CONFIG = {value: {label: 'Rate'}} satisfies ChartConfig;

// Two rings, not three. The old outer "Sent" ring was always a full circle, so it
// carried no information — it read as chrome. Sent is now the number in the middle:
// the total the two rates are of. Opened and Clicked each move out one position,
// leaving a hollow centre big enough for it.
const RING_RADII = {
    opened: {innerRadius: 88, outerRadius: 110},
    clicked: {innerRadius: 63, outerRadius: 85}
};

// One ring of the nested donut. When `tracked` is false it renders as a faded
// empty track — "present but not measured" — so "tracking off" never reads as 0%.
const PerformanceRing: React.FC<{
    datatype: string;
    value: number;
    color: 'blue' | 'teal';
    innerRadius: number;
    outerRadius: number;
    tracked?: boolean;
}> = ({datatype, value, color, innerRadius, outerRadius, tracked = true}) => {
    const gradientId = `protoEmailRing-${color}`;
    const colorVar = `var(--chart-${color})`;
    return (
        <ChartContainer className={`absolute inset-0 aspect-square ${tracked ? '' : 'opacity-30'}`} config={RING_CHART_CONFIG}>
            <Recharts.RadialBarChart
                data={[{datatype, value: tracked ? value : 0}]}
                endAngle={-270}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={90}
            >
                <defs>
                    <radialGradient cx="30%" cy="30%" id={gradientId} r="70%">
                        <stop offset="0%" stopColor={colorVar} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={colorVar} stopOpacity={1} />
                    </radialGradient>
                </defs>
                <Recharts.PolarAngleAxis angleAxisId={0} domain={[0, 1]} tick={false} type="number" />
                {/* No in-arc label any more — the rings are named by the legend below,
                    so curved text on them was a second, harder-to-read copy. */}
                <Recharts.RadialBar
                    angleAxisId={0}
                    cornerRadius={10}
                    dataKey="value"
                    fill={`url(#${gradientId})`}
                    minPointSize={-2}
                    background
                />
            </Recharts.RadialBarChart>
        </ChartContainer>
    );
};

const PerformanceChart: React.FC<{
    openRate: number;
    clickRate: number;
    opensTracked: boolean;
    clicksTracked: boolean;
    sentCount: number;
}> = ({openRate, clickRate, opensTracked, clicksTracked, sentCount}) => (
    <div className="relative mx-auto aspect-square size-[240px]">
        <PerformanceRing color="blue" datatype="Opened" innerRadius={RING_RADII.opened.innerRadius} outerRadius={RING_RADII.opened.outerRadius} tracked={opensTracked} value={openRate} />
        <PerformanceRing color="teal" datatype="Clicked" innerRadius={RING_RADII.clicked.innerRadius} outerRadius={RING_RADII.clicked.outerRadius} tracked={clicksTracked} value={clickRate} />
        {/* Sent lives in the hollow centre: the total both rates are measured
            against. pointer-events-none so it never intercepts the rings. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="text-sm text-text-secondary">Sent</span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatNumber(sentCount)}</span>
        </div>
    </div>
);

const KpiDot: React.FC<{color: string}> = ({color}) => (
    <span aria-hidden="true" className="size-2 rounded-full" style={{backgroundColor: color}} />
);

const Kpi: React.FC<{label: string; color: string; tracked?: boolean; children: React.ReactNode}> = ({label, color, tracked = true, children}) => (
    <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
            <KpiDot color={tracked ? color : 'var(--muted-foreground)'} />
            {label}
        </span>
        {tracked
            ? <span className="text-xl font-semibold tracking-tight tabular-nums">{children}</span>
            : <OffValue className="text-xl" />}
    </div>
);

// --- Top clicked links -----------------------------------------------------

// Ported from the shipped sidebar (automations/components/canvas/
// email-performance-section.tsx, #29639) — same DataList markup, same
// truncation, tooltip and count/percentage formatting. The only difference is
// where the rows come from: no links API exists on this branch, so they're
// generated per action id (see shared/email-links), which also means the
// loading and error branches the real one carries have nothing to represent
// here.
const displayUrl = (url: string) => url.replace(/^https?:\/\//i, '');

// CSS can only ellipsize at the end of a line, so middle truncation is two
// spans: the head truncates and the tail (the URL's last characters) never
// shrinks — the ellipsis lands mid-URL and the end stays visible, which is the
// part that actually distinguishes one long link from another.
const MIDDLE_TRUNCATE_TAIL = 14;

export const TopClickedLinksContent: React.FC<{
    clickedCount: number;
    links: ProtoActionLink[];
    sentCount: number;
}> = ({clickedCount, links, sentCount}) => {
    if (sentCount === 0) {
        return <Text className="py-6 text-center" size="sm" tone="secondary">No emails sent yet.</Text>;
    }

    if (links.length === 0) {
        return <Text className="py-6 text-center" size="sm" tone="secondary">No link data to show.</Text>;
    }

    return (
        <TooltipProvider delayDuration={150}>
            <DataList className="group/datalist">
                <DataListBody>
                    {links.map((link) => {
                        const percentage = clickedCount > 0 ? Math.min(link.clicked_count / clickedCount, 1) : 0;
                        const display = displayUrl(link.url);
                        const head = display.slice(0, Math.max(display.length - MIDDLE_TRUNCATE_TAIL, 0));
                        const tail = display.slice(Math.max(display.length - MIDDLE_TRUNCATE_TAIL, 0));
                        return (
                            <DataListRow key={link.url}>
                                <DataListBar style={{width: `${Math.round(percentage * 100)}%`}} />
                                <DataListItemContent>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <a className="block min-w-0 hover:underline" href={link.url} rel="noreferrer" target="_blank">
                                                <Inline as="span" className="min-w-0" gap="sm">
                                                    {/* Plain spans, so they inherit the
                                                        text-sm font-medium DataListItemContent
                                                        already sets — the same way the shipping
                                                        analytics rows do it. Shade's Text would
                                                        override that with its own md default,
                                                        which is what made these read larger than
                                                        the equivalent list on analytics. */}
                                                    <span className="flex min-w-0">
                                                        <span className="truncate">{head}</span>
                                                        <span className="shrink-0 whitespace-nowrap">{tail}</span>
                                                    </span>
                                                </Inline>
                                            </a>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-[28rem] break-all">{link.url}</TooltipContent>
                                    </Tooltip>
                                </DataListItemContent>
                                <DataListItemValue>
                                    <DataListItemValueAbs>{formatNumber(link.clicked_count)}</DataListItemValueAbs>
                                    <DataListItemValuePerc>{formatPercentage(percentage)}</DataListItemValuePerc>
                                </DataListItemValue>
                            </DataListRow>
                        );
                    })}
                </DataListBody>
            </DataList>
        </TooltipProvider>
    );
};

// Each section is its own bordered card, matching the automation performance pane
// (float/panels.tsx) so the two analytics surfaces read as one system. The cards
// do the separating, so there are no rules between them.
// actionId: identifies which email's links to show; omit to hide the section.
export const EmailPerformance: React.FC<StatsProps & {actionId?: string}> = ({stats, opensTracked = true, clicksTracked = true, actionId}) => {
    // Mock rates are whole percentages (0–100); the donut wants 0–1.
    const openRate = (stats.opened_rate ?? 0) / 100;
    const clickRate = (stats.clicked_rate ?? 0) / 100;
    const links = actionId ? actionLinks(actionId, stats.email_clicked_count) : [];
    return (
        // xl between the two sections — the links list is a new subject and needs
        // more air than the legend does from its own chart.
        <Stack gap="xl">
            {/* The sheet's title is the email subject now, so this section names
                itself — same label style as Top clicked links below. Chart first, then
                the two rates it plots; Sent is inside the rings. Chart and each KPI in
                a card of its own (the pane's card recipe), all at the same 12px gap so
                the three read as one group. */}
            <Stack gap="md">
                <Text size="sm" tone="secondary" weight="medium">Performance</Text>
                <Box className="rounded-lg border border-border-default px-4 py-3">
                    {/* sm to the legend — the 240px chart square already carries
                        ~10px of slack below the rings. */}
                    <Stack gap="sm">
                        <PerformanceChart
                            clickRate={clickRate}
                            clicksTracked={clicksTracked}
                            openRate={openRate}
                            opensTracked={opensTracked}
                            sentCount={stats.email_sent_count}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Kpi color="var(--chart-blue)" label="Opened" tracked={opensTracked}>{formatPercentage(openRate)}</Kpi>
                            <Kpi color="var(--chart-teal)" label="Clicked" tracked={clicksTracked}>{formatPercentage(clickRate)}</Kpi>
                        </div>
                    </Stack>
                </Box>
            </Stack>
            {/* Hidden entirely when click tracking is off — the Clicked KPI and ring
                already convey that state (matches the shipped section). */}
            {actionId && clicksTracked && (
                <Stack gap="md">
                    <Inline justify="between">
                        <Text size="sm" tone="secondary" weight="medium">Top clicked links</Text>
                        <Text size="sm" tone="tertiary" weight="medium">Members</Text>
                    </Inline>
                    <TopClickedLinksContent
                        clickedCount={stats.email_clicked_count}
                        links={links}
                        sentCount={stats.email_sent_count}
                    />
                </Stack>
            )}
        </Stack>
    );
};
