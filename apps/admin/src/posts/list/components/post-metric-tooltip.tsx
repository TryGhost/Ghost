import {HoverCard, HoverCardContent, HoverCardTrigger} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {formatNumber} from '@tryghost/shade/utils';
import {POST_METRIC_ICONS} from '@/posts/list/post-metric-icons';
import type {PostMetricTooltipRow} from '@/posts/list/post-metric-tooltips';
import type {ReactNode} from 'react';

interface PostMetricTooltipProps {
    title: string;
    rows: PostMetricTooltipRow[];
    children: ReactNode;
}

/**
 * The breakdown Ember reveals on hovering a metric — "Web traffic", "Newsletter
 * performance", "New members". Ember positions and flips these by hand;
 * Shade's Radix wrapper already does that.
 *
 * `HoverCard`, not `Tooltip`: Shade's tooltip is the small dark chip
 * (`bg-primary` / `text-primary-foreground`), which is both the wrong shape for
 * a labelled table and the wrong colour — the semantic text tones inside would
 * be dark-on-dark. Ember's is a white elevated card, which is what `HoverCard`
 * is. No delay, so it behaves like Ember's CSS-only hover.
 */
export function PostMetricTooltip({title, rows, children}: PostMetricTooltipProps) {
    return (
        <HoverCard closeDelay={0} openDelay={0}>
            <HoverCardTrigger asChild>{children}</HoverCardTrigger>
            {/* `pointer-events-none`, as Ember's tooltip is. Radix's default
                keeps the card interactive, but it portals outside the row — so
                moving onto it would fire the row's mouseleave and drop the row
                hover, the visible CTA border and the status detail. Nothing in
                the card is clickable, so nothing is lost. */}
            {/* Above the metric, as Ember's is: its `.above` positioning is the
                default and it drops below only when there is no room. Radix
                flips on collision by itself, so `side` sets the preference and
                the fallback comes free. */}
            <HoverCardContent className='pointer-events-none w-48 p-3' data-testid='post-metric-panel' side='top'>
                <Stack gap='xs'>
                    <Text size='sm' weight='semibold'>{title}</Text>
                    {rows.map((row) => {
                        const Icon = POST_METRIC_ICONS[row.icon];

                        return (
                            <Inline key={row.label} gap='md' justify='between'>
                                <Inline align='center' gap='xs'>
                                    <Icon className='size-3.5 shrink-0 text-muted-foreground' strokeWidth={1.5} />
                                    <Text size='sm' tone='secondary'>{row.label}</Text>
                                </Inline>
                                {/* Mono, as the analytics tables are: the
                                    figures line up on their digits when several
                                    rows sit under each other. */}
                                <Text className='font-mono' size='sm'>{formatNumber(row.value)}</Text>
                            </Inline>
                        );
                    })}
                </Stack>
            </HoverCardContent>
        </HoverCard>
    );
}
