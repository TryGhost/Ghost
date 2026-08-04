import {HoverCard, HoverCardContent, HoverCardTrigger} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {formatNumber} from '@tryghost/shade/utils';
import type {ReactNode} from 'react';

export interface MetricTooltipRow {
    label: string;
    value: number;
}

interface PostMetricTooltipProps {
    title: string;
    rows: MetricTooltipRow[];
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
            <HoverCardContent className='pointer-events-none w-44 p-3' data-testid='post-metric-panel'>
                <Stack gap='xs'>
                    <Text size='sm' weight='semibold'>{title}</Text>
                    {rows.map(row => (
                        <Inline key={row.label} gap='md' justify='between'>
                            <Text size='sm' tone='secondary'>{row.label}</Text>
                            <Text size='sm'>{formatNumber(row.value)}</Text>
                        </Inline>
                    ))}
                </Stack>
            </HoverCardContent>
        </HoverCard>
    );
}
