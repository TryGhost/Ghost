import './styles.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { ShadeApp } from '@tryghost/shade/app';
import { type Root, createRoot } from 'react-dom/client';
import { type GhostContext, ghost } from './sdk';

interface Post {
  id: string;
  published_at: string;
  email?: { email_count: number; opened_count: number; submitted_at?: string | null } | null;
  count?: { clicks?: number };
}

interface Send {
  /** Local time of day the newsletter went out, in hours (0–24). */
  hour: number;
  openRate: number;
  clickRate: number;
}

const SLOTS = 96; // 15-minute slots across the day
const SLOT_HOURS = 24 / SLOTS;
const WINDOW_SLOTS = 8; // the recommended range is two hours wide
const SMOOTHING_HOURS = 1.25;
const TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

function useSends() {
  const [sends, setSends] = useState<Send[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setSends(null);
    setError(null);
    const params = new URLSearchParams({
      filter: 'status:[published,sent]',
      include: 'email,count.clicks',
      order: 'published_at desc',
      limit: '200',
    });
    try {
      const response = await ghost.get<{ posts: Post[] }>(`/posts/?${params.toString()}`);
      setSends(
        response.posts.flatMap((post) => {
          const recipients = post.email?.email_count ?? 0;
          if (!post.email || recipients === 0) {
            return [];
          }
          const sentAt = new Date(post.email.submitted_at ?? post.published_at);
          return [
            {
              hour: sentAt.getHours() + sentAt.getMinutes() / 60,
              openRate: post.email.opened_count / recipients,
              clickRate: (post.count?.clicks ?? 0) / recipients,
            },
          ];
        }),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Couldn’t load newsletters');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { sends, error, reload: load };
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

/** Shortest distance between two times of day, wrapping at midnight. */
function hoursApart(a: number, b: number) {
  const distance = Math.abs(a - b) % 24;
  return Math.min(distance, 24 - distance);
}

/**
 * Engagement for every slot of the day. Each send scores its open and click
 * rates against the site's own averages, so both count equally; nearby sends
 * are blended in with a Gaussian. Hours with few sends lean toward the
 * weakest score, so an untested slot never outranks a proven one.
 */
function engagementCurve(sends: Send[]) {
  const avgOpen = mean(sends.map((send) => send.openRate)) || 1;
  const avgClick = mean(sends.map((send) => send.clickRate)) || 1;
  const scores = sends.map(
    (send) => send.openRate / avgOpen + (avgClick > 0 ? send.clickRate / avgClick : 0),
  );
  const baseline = Math.min(...scores);

  return Array.from({ length: SLOTS }, (_, slot) => {
    const at = (slot + 0.5) * SLOT_HOURS;
    let weighted = 0;
    let weights = 0;
    sends.forEach((send, index) => {
      const weight = Math.exp(-((hoursApart(at, send.hour) / SMOOTHING_HOURS) ** 2) / 2);
      weighted += weight * scores[index];
      weights += weight;
    });
    return (weighted + baseline) / (weights + 1);
  });
}

/** Start slot of the best-scoring window, which may wrap past midnight. */
function bestWindow(curve: number[]) {
  let best = 0;
  let bestTotal = -Infinity;
  for (let start = 0; start < SLOTS; start++) {
    let total = 0;
    for (let offset = 0; offset < WINDOW_SLOTS; offset++) {
      total += curve[(start + offset) % SLOTS];
    }
    if (total > bestTotal) {
      bestTotal = total;
      best = start;
    }
  }
  return best;
}

function inWindow(slot: number, start: number) {
  return (slot - start + SLOTS) % SLOTS < WINDOW_SLOTS;
}

function formatSlot(slot: number) {
  const minutes = (slot % SLOTS) * SLOT_HOURS * 60;
  return new Date(2000, 0, 1, 0, minutes).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTick(hour: number) {
  return new Date(2000, 0, 1, hour % 24).toLocaleTimeString(undefined, { hour: 'numeric' });
}

/** The highlighted range, split in two when it wraps past midnight. */
function windowSegments(start: number) {
  const end = start + WINDOW_SLOTS;
  return end <= SLOTS
    ? [{ from: start, to: end }]
    : [
        { from: start, to: SLOTS },
        { from: 0, to: end - SLOTS },
      ];
}

const pct = (slots: number) => `${(slots / SLOTS) * 100}%`;

const Timeline: React.FC<{ curve: number[] | null; start: number }> = ({ curve, start }) => {
  const min = curve ? Math.min(...curve) : 0;
  const range = curve ? Math.max(...curve) - min || 1 : 1;

  return (
    <div className="w-full">
      <div className="relative mt-6 h-72">
        {curve &&
          windowSegments(start).map(({ from, to }) => (
            <div
              key={from}
              className="absolute -inset-y-4 rounded-xl border-2 border-(--chart) bg-(--chart)/10"
              style={{ left: pct(from), width: pct(to - from) }}
            />
          ))}
        <div className="relative flex h-full items-end gap-[2px]">
          {Array.from({ length: SLOTS }, (_, slot) => {
            const strength = curve ? (curve[slot] - min) / range : 0;
            const active = curve !== null && inWindow(slot, start);
            return (
              <div
                key={slot}
                className={cn(
                  'flex-1 rounded-full',
                  curve ? 'bar' : 'animate-pulse bg-muted',
                  active
                    ? 'bg-linear-to-t from-(--chart)/60 to-(--chart)'
                    : curve && 'bg-(--chart)',
                )}
                style={{
                  height: `${(0.1 + 0.9 * strength) * 100}%`,
                  opacity: curve && !active ? 0.12 + 0.3 * strength : undefined,
                  animationDelay: curve ? `${slot * 6}ms` : undefined,
                }}
              />
            );
          })}
        </div>
      </div>
      <div className="relative mt-6 h-4 border-t">
        {TICKS.map((hour) => (
          <span
            key={hour}
            className="absolute top-2 -translate-x-1/2 text-xs whitespace-nowrap text-muted-foreground tabular-nums"
            style={{ left: `${(hour / 24) * 100}%` }}
          >
            {formatTick(hour)}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Converts any CSS colour (hex, hsl, oklch…) to sRGB by painting it. */
function toRgb(color: string): [number, number, number] | null {
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!context) {
    return null;
  }
  context.fillStyle = '#000';
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return [red, green, blue];
}

function luminance([red, green, blue]: [number, number, number]) {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** WCAG's minimum for graphics against their background. */
const MIN_CHART_CONTRAST = 3;

/** Waits for `connected` so the request follows the bridge handshake. */
function useAccentColor(connected: boolean) {
  const [accent, setAccent] = useState<string | null>(null);
  useEffect(() => {
    if (!connected) {
      return;
    }
    ghost
      .get<{ site: { accent_color?: string | null } }>('/site/')
      .then((response) => setAccent(response.site.accent_color || null))
      .catch(() => setAccent(null));
  }, [connected]);
  return accent;
}

/**
 * The site's accent colour when it stands out against the page, in either
 * theme; otherwise Shade's chart blue. Set as `--chart` on `ref`.
 */
function useChartColor(
  ref: React.RefObject<HTMLElement | null>,
  theme: GhostContext['theme'] | undefined,
) {
  const accent = useAccentColor(theme !== undefined);
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const background = toRgb(getComputedStyle(element).backgroundColor);
    const color = accent ? toRgb(accent) : null;
    const usable = background && color && contrast(color, background) >= MIN_CHART_CONTRAST;
    element.style.setProperty('--chart', usable ? accent : 'var(--color-chart-blue)');
  }, [ref, accent, theme]);
}

const BestTime: React.FC = () => {
  const { sends, error, reload } = useSends();
  const curve = useMemo(() => (sends?.length ? engagementCurve(sends) : null), [sends]);
  const start = useMemo(() => (curve ? bestWindow(curve) : 0), [curve]);

  if (error) {
    return (
      <Stack align="center" gap="md">
        <Text tone="secondary">{error}</Text>
        <Button variant="outline" onClick={() => void reload()}>
          Try again
        </Button>
      </Stack>
    );
  }

  if (sends?.length === 0) {
    return <Text tone="secondary">Send a newsletter and your best time will show up here.</Text>;
  }

  return (
    <Stack align="center" className="w-full max-w-5xl" gap="2xl">
      <Stack align="center" gap="sm">
        <Text size="sm" tone="secondary" weight="medium">
          Best time to send
        </Text>
        <h1 className="text-[6.4rem] leading-none font-semibold tracking-tight tabular-nums">
          {curve ? (
            `${formatSlot(start)} – ${formatSlot(start + WINDOW_SLOTS)}`
          ) : (
            <span className="text-muted-foreground/40">––:–– – ––:––</span>
          )}
        </h1>
      </Stack>
      <Timeline curve={curve} start={start} />
      <Text size="xs" tone="secondary">
        {sends ? `Based on opens and clicks from ${sends.length} newsletters` : ' '}
      </Text>
    </Stack>
  );
};

const App: React.FC = () => {
  const [context, setContext] = useState<GhostContext | null>(null);

  useEffect(() => {
    const unsubscribe = ghost.onContextChange(setContext);
    ghost
      .ready()
      .then((initial) => {
        setContext(initial);
        void ghost.setTitle('Best time to send');
      })
      .catch(() => {
        // Opened outside Ghost: render with defaults.
        setContext({
          site: { title: '', url: '' },
          user: { name: '', email: '' },
          theme: 'light',
          route: '/',
        });
      });
    return () => {
      unsubscribe();
    };
  }, []);

  // Shade's dark tokens hang off `html.dark`, as in Admin itself.
  useEffect(() => {
    document.documentElement.style.colorScheme = context?.theme ?? 'light';
    document.documentElement.classList.toggle('dark', context?.theme === 'dark');
  }, [context?.theme]);

  // After the theme effect, so the contrast check sees the right background.
  const canvasRef = useRef<HTMLDivElement>(null);
  useChartColor(canvasRef, context?.theme);

  if (!context) {
    return null;
  }

  return (
    <ShadeApp className="h-full bg-background text-foreground" darkMode={context.theme === 'dark'}>
      <div
        ref={canvasRef}
        className="flex h-full items-center justify-center bg-background p-8 [--chart:var(--color-chart-blue)]"
      >
        <BestTime />
      </div>
    </ShadeApp>
  );
};

// Reuse the root if this entry runs again (Vite re-runs it when Tailwind
// regenerates styles.css); a second createRoot would render the app twice.
declare global {
  interface Window {
    __bestTimeToSendRoot?: Root;
  }
}
window.__bestTimeToSendRoot ??= createRoot(document.getElementById('root')!);
window.__bestTimeToSendRoot.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
