import './styles.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Skeleton } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { ShadeApp } from '@tryghost/shade/app';
import { type Root, createRoot } from 'react-dom/client';
import { type GhostContext, ghost } from './sdk';

interface Post {
  id: string;
  title: string;
  status: 'published' | 'scheduled';
  published_at: string;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfWeek(date: Date) {
  return addDays(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    -((date.getDay() + 6) % 7),
  );
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Six weeks starting on the Monday on or before the 1st, so the grid never jumps. */
function calendarDays(month: Date) {
  const start = startOfWeek(startOfMonth(month));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function toFilterDate(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function usePosts(filter: string) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPosts(null);
    setError(null);
    const params = new URLSearchParams({
      filter,
      fields: 'id,title,status,published_at',
      order: 'published_at asc',
      limit: 'all',
    });
    try {
      const response = await ghost.get<{ posts: Post[] }>(`/posts/?${params.toString()}`);
      setPosts(response.posts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Couldn’t load posts');
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return { posts, error, reload: load };
}

function postsBetween(from: Date, to: Date) {
  return `status:[published,scheduled]+published_at:>='${toFilterDate(from)}'+published_at:<'${toFilterDate(to)}'`;
}

function groupByDay(posts: Post[] | null) {
  const map = new Map<string, Post[]>();
  for (const post of posts ?? []) {
    const key = dayKey(new Date(post.published_at));
    map.set(key, [...(map.get(key) ?? []), post]);
  }
  return map;
}

const openPost = (post: Post) => void ghost.navigate(`/editor/post/${post.id}`);

const StatusDot: React.FC<{ status: Post['status'] }> = ({ status }) => (
  <span
    aria-hidden="true"
    className={cn(
      'size-1.5 shrink-0 rounded-full',
      status === 'scheduled' ? 'bg-state-info' : 'bg-state-success',
    )}
  />
);

const PostChip: React.FC<{ post: Post }> = ({ post }) => (
  <button
    className="flex w-full items-center gap-1.5 truncate rounded-sm px-1.5 py-1 text-left text-sm hover:bg-muted"
    title={post.title}
    type="button"
    onClick={() => openPost(post)}
  >
    <StatusDot status={post.status} />
    <span className="truncate">{post.title || '(Untitled)'}</span>
  </button>
);

const Legend: React.FC = () => (
  <Inline className="mr-2" gap="sm">
    <Badge className="gap-1.5" variant="secondary">
      <StatusDot status="scheduled" /> Scheduled
    </Badge>
    <Badge className="gap-1.5" variant="secondary">
      <StatusDot status="published" /> Published
    </Badge>
  </Inline>
);

const Stepper: React.FC<{
  label: string;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
}> = ({ label, onPrevious, onToday, onNext }) => (
  <Inline gap="sm">
    <Button
      aria-label={`Previous ${label}`}
      className="size-(--control-height)"
      size="icon"
      variant="outline"
      onClick={onPrevious}
    >
      <LucideIcon.ChevronLeft />
    </Button>
    <Button variant="outline" onClick={onToday}>
      Today
    </Button>
    <Button
      aria-label={`Next ${label}`}
      className="size-(--control-height)"
      size="icon"
      variant="outline"
      onClick={onNext}
    >
      <LucideIcon.ChevronRight />
    </Button>
  </Inline>
);

const Header: React.FC<{ title: string; subtitle: string; children?: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <Inline gap="md" justify="between">
    <Stack gap="none">
      <Text as="h1" size="xl" weight="semibold">
        {title}
      </Text>
      <Text size="sm" tone="secondary">
        {subtitle}
      </Text>
    </Stack>
    <Inline gap="sm">{children}</Inline>
  </Inline>
);

const LoadError: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <Stack align="center" className="flex-1 justify-center" gap="md">
    <Text tone="secondary">{error}</Text>
    <Button variant="outline" onClick={onRetry}>
      Try again
    </Button>
  </Stack>
);

const MonthView: React.FC = () => {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const days = useMemo(() => calendarDays(month), [month]);
  const { posts, error, reload } = usePosts(postsBetween(days[0], addDays(days[41], 1)));
  const postsByDay = useMemo(() => groupByDay(posts), [posts]);
  const today = dayKey(new Date());
  const scheduledCount = (posts ?? []).filter(
    (post) =>
      post.status === 'scheduled' && new Date(post.published_at).getMonth() === month.getMonth(),
  ).length;

  return (
    <Stack className="h-full" gap="lg">
      <Header
        subtitle={posts === null ? 'Loading posts…' : `${scheduledCount} scheduled this month`}
        title={month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
      >
        <Legend />
        <Stepper
          label="month"
          onNext={() => setMonth((current) => addMonths(current, 1))}
          onPrevious={() => setMonth((current) => addMonths(current, -1))}
          onToday={() => setMonth(startOfMonth(new Date()))}
        />
      </Header>

      {error ? (
        <LoadError error={error} onRetry={() => void reload()} />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] overflow-hidden rounded-lg border">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="border-b px-2 py-1.5 text-xs font-medium tracking-wide text-muted-foreground"
            >
              {weekday}
            </div>
          ))}
          {days.map((day, index) => {
            const key = dayKey(day);
            const inMonth = day.getMonth() === month.getMonth();
            return (
              <div
                key={key}
                className={cn(
                  'flex min-h-0 flex-col gap-0.5 overflow-hidden p-1',
                  index % 7 !== 6 && 'border-r',
                  index < 35 && 'border-b',
                  !inMonth && 'bg-muted/40',
                )}
              >
                <span
                  className={cn(
                    'mb-0.5 flex size-6 items-center justify-center self-start rounded-full text-xs',
                    key === today
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : inMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground',
                  )}
                >
                  {day.getDate()}
                </span>
                {posts === null
                  ? inMonth && index % 3 === 0 && <Skeleton className="mx-1 h-3 w-3/4" />
                  : (postsByDay.get(key) ?? []).map((post) => (
                      <PostChip key={post.id} post={post} />
                    ))}
              </div>
            );
          })}
        </div>
      )}
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
        void ghost.setTitle('Content calendar');
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

  useEffect(() => {
    document.documentElement.style.colorScheme = context?.theme ?? 'light';
  }, [context?.theme]);

  if (!context) {
    return null;
  }

  return (
    <ShadeApp className="h-full bg-background text-foreground" darkMode={context.theme === 'dark'}>
      <div className="h-full">
        <MonthView />
      </div>
    </ShadeApp>
  );
};

// Reuse the root if this entry runs again (Vite re-runs it when Tailwind
// regenerates styles.css); a second createRoot would render the app twice.
declare global {
  interface Window {
    __contentCalendarRoot?: Root;
  }
}
window.__contentCalendarRoot ??= createRoot(document.getElementById('root')!);
window.__contentCalendarRoot.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
