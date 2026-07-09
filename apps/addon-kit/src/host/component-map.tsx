import {forwardRef, type ReactNode} from 'react';
import {
    createRemoteComponentRenderer,
    RemoteFragmentRenderer,
    type RemoteComponentRendererMap
} from '@remote-dom/react/host';
import {Badge, Button, Separator, Tabs, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {H2, H3, H4, Inline, Stack, Text} from '@tryghost/shade/primitives';
import {GhAreaChart, KpiCardHeaderLabel, KpiCardHeaderValue, type GhAreaChartDataItem} from '@tryghost/shade/patterns';
import {formatNumber} from '@tryghost/shade/utils';
import type {
    GhBadgeVariant,
    GhButtonVariant,
    GhHeadingLevel,
    GhInlineJustify,
    GhSparklineColor,
    GhStackGap,
    GhStatDeltaDirection,
    GhTextTone,
    GhTextWeight
} from '../addon/elements.ts';

/**
 * Maps each `gh-*` primitive to a real Shade component. All styling lives
 * here on the host — add-ons render against the component contract, never
 * against DOM or CSS, which is what keeps them upgrade-safe.
 */

const BUTTON_VARIANTS: Record<GhButtonVariant, 'default' | 'secondary' | 'destructive'> = {
    primary: 'default',
    secondary: 'secondary',
    destructive: 'destructive'
};

const TEXT_TONES: Record<GhTextTone, 'primary' | 'secondary'> = {
    default: 'primary',
    muted: 'secondary'
};

const TEXT_WEIGHTS: Record<GhTextWeight, 'regular' | 'medium' | 'semibold'> = {
    normal: 'regular',
    medium: 'medium',
    semibold: 'semibold'
};

interface GhTextHostProps {
    tone?: GhTextTone;
    weight?: GhTextWeight;
    children?: ReactNode;
}

const GhTextHost = createRemoteComponentRenderer(forwardRef<HTMLElement, GhTextHostProps>(
    function GhTextHost({tone = 'default', weight = 'normal', children}, ref) {
        return (
            <Text ref={ref} as="span" tone={TEXT_TONES[tone] ?? 'primary'} weight={TEXT_WEIGHTS[weight] ?? 'regular'}>
                {children}
            </Text>
        );
    }
));

interface GhStackHostProps {
    gap?: GhStackGap;
    children?: ReactNode;
}

const GhStackHost = createRemoteComponentRenderer(forwardRef<HTMLDivElement, GhStackHostProps>(
    function GhStackHost({gap = 'md', children}, ref) {
        // align="start" so buttons and other intrinsic-width children keep
        // their natural size instead of stretching to the card width; w-full
        // so nested stacks/rows still span the surface.
        return <Stack ref={ref} align="start" className="w-full" gap={gap}>{children}</Stack>;
    }
));

interface GhInlineHostProps {
    gap?: GhStackGap;
    justify?: GhInlineJustify;
    children?: ReactNode;
}

const GhInlineHost = createRemoteComponentRenderer(forwardRef<HTMLElement, GhInlineHostProps>(
    function GhInlineHost({gap = 'sm', justify = 'start', children}, ref) {
        return <Inline ref={ref} align="center" className="w-full" gap={gap} justify={justify} wrap>{children}</Inline>;
    }
));

const BADGE_VARIANTS: Record<GhBadgeVariant, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
    default: 'default',
    success: 'success',
    warning: 'warning',
    destructive: 'destructive',
    outline: 'outline'
};

interface GhBadgeHostProps {
    variant?: GhBadgeVariant;
    children?: ReactNode;
}

const GhBadgeHost = createRemoteComponentRenderer(forwardRef<HTMLDivElement, GhBadgeHostProps>(
    // Shade's Badge is a plain function component without ref support; the
    // forwardRef wrapper only absorbs the renderer-provided ref.
    function GhBadgeHost({variant = 'default', children}) {
        return <Badge variant={BADGE_VARIANTS[variant] ?? 'default'}>{children}</Badge>;
    }
));

const HEADINGS: Record<GhHeadingLevel, typeof H2> = {2: H2, 3: H3, 4: H4};

interface GhHeadingHostProps {
    level?: GhHeadingLevel;
    children?: ReactNode;
}

const GhHeadingHost = createRemoteComponentRenderer(forwardRef<HTMLHeadingElement, GhHeadingHostProps>(
    function GhHeadingHost({level = 3, children}, ref) {
        const Heading = HEADINGS[level] ?? H3;
        return <Heading ref={ref}>{children}</Heading>;
    }
));

const GhSeparatorHost = createRemoteComponentRenderer(forwardRef<HTMLDivElement, {className?: string}>(
    function GhSeparatorHost(_, ref) {
        return <Separator ref={ref} className="my-1 w-full" />;
    }
));

interface GhStatHostProps {
    label?: string;
    value?: string;
    delta?: string;
    deltaDirection?: GhStatDeltaDirection;
    children?: ReactNode;
}

const GhStatHost = createRemoteComponentRenderer(forwardRef<HTMLDivElement, GhStatHostProps>(
    function GhStatHost({label, value, delta, deltaDirection}, ref) {
        return (
            <div ref={ref} className="flex flex-col items-start gap-1">
                {label && <KpiCardHeaderLabel>{label}</KpiCardHeaderLabel>}
                <KpiCardHeaderValue
                    diffDirection={delta ? (deltaDirection ?? 'same') : 'hidden'}
                    diffValue={delta}
                    value={value ?? ''}
                />
            </div>
        );
    }
));

const SPARKLINE_COLORS: Record<GhSparklineColor, string> = {
    blue: 'var(--chart-blue)',
    green: 'var(--chart-green)',
    red: 'var(--chart-rose)'
};

interface GhSparklineHostProps {
    points?: number[];
    label?: string;
    color?: GhSparklineColor;
    children?: ReactNode;
}

const GhSparklineHost = createRemoteComponentRenderer(forwardRef<HTMLDivElement, GhSparklineHostProps>(
    function GhSparklineHost({points, label, color = 'blue'}, ref) {
        const values = (points ?? []).filter((point): point is number => typeof point === 'number');
        if (values.length < 2) {
            return null;
        }
        // Points are value-only; the host spreads them over the past N days.
        const dayMs = 24 * 60 * 60 * 1000;
        const today = Date.now();
        const data: GhAreaChartDataItem[] = values.map((value, index) => ({
            date: new Date(today - ((values.length - 1 - index) * dayMs)).toISOString().slice(0, 10),
            value,
            formattedValue: formatNumber(value),
            label: label ?? 'Value'
        }));
        // The id feeds SVG gradient url(#…) references — keep it identifier-safe.
        const chartId = `gh-addon-sparkline-${(label ?? 'value').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        return (
            <div ref={ref} className="w-full">
                <GhAreaChart
                    className="h-[120px] w-full"
                    color={SPARKLINE_COLORS[color] ?? SPARKLINE_COLORS.blue}
                    data={data}
                    id={chartId}
                    range={values.length}
                    showHorizontalLines={false}
                    showYAxisValues={false}
                />
            </div>
        );
    }
));

interface GhTabsHostProps {
    value?: string;
    onChange?: (value: string) => void;
    children?: ReactNode;
}

const GhTabsHost = createRemoteComponentRenderer(forwardRef<HTMLDivElement, GhTabsHostProps>(
    function GhTabsHost({value, onChange, children}, ref) {
        return (
            <Tabs ref={ref} value={value} variant="underline" onValueChange={next => void onChange?.(next)}>
                <TabsList>{children}</TabsList>
            </Tabs>
        );
    }
));

interface GhTabHostProps {
    value?: string;
    children?: ReactNode;
}

const GhTabHost = createRemoteComponentRenderer(forwardRef<HTMLButtonElement, GhTabHostProps>(
    function GhTabHost({value, children}, ref) {
        return <TabsTrigger ref={ref} value={value ?? ''}>{children}</TabsTrigger>;
    }
));

interface GhButtonHostProps {
    variant?: GhButtonVariant;
    disabled?: boolean;
    onPress?: () => void;
    children?: ReactNode;
}

const GhButtonHost = createRemoteComponentRenderer(forwardRef<HTMLButtonElement, GhButtonHostProps>(
    function GhButtonHost({variant = 'primary', disabled, onPress, children}, ref) {
        return (
            <Button
                ref={ref}
                disabled={disabled}
                variant={BUTTON_VARIANTS[variant] ?? 'default'}
                onClick={() => void onPress?.()}
            >
                {children}
            </Button>
        );
    }
));

export const GH_COMPONENT_MAP: RemoteComponentRendererMap = new Map([
    ['gh-text', GhTextHost],
    ['gh-stack', GhStackHost],
    ['gh-inline', GhInlineHost],
    ['gh-badge', GhBadgeHost],
    ['gh-heading', GhHeadingHost],
    ['gh-separator', GhSeparatorHost],
    ['gh-stat', GhStatHost],
    ['gh-sparkline', GhSparklineHost],
    ['gh-tabs', GhTabsHost],
    ['gh-tab', GhTabHost],
    ['gh-button', GhButtonHost],
    // Wrapper emitted by the Preact authoring surface for slotted props.
    ['remote-fragment', RemoteFragmentRenderer]
]);
