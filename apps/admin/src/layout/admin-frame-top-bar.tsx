import React from 'react';
import { Link, useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { cn, formatNumber, LucideIcon } from '@tryghost/shade/utils';
import { useOpenGlobalSearch } from '@/global-search/global-search-context';
import { searchShortcutLabel } from '@/global-search/search-shortcut';
import { useFrameStats } from './use-frame-stats';

// Small caps, as in the Admin 7 vision
const LABEL = 'text-[10px] leading-none font-medium tracking-[0.04em] uppercase';
const MUTED = 'text-gray-600';

/** Option + 1 and Option + 2 switch between Ghost and View site. */
const PLACE_SHORTCUTS: Record<string, string> = {
  Digit1: '/',
  Digit2: '/site',
};

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function usePlaceShortcuts() {
  const navigate = useNavigate();

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) {
        return;
      }
      // The physical key: on a Mac, Option + digit types a special character
      const to = PLACE_SHORTCUTS[event.code];
      if (to && !isEditable(event.target)) {
        event.preventDefault();
        navigate(to);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);
}

interface PlaceTabProps {
  to: string;
  active: boolean;
  shortcut: string;
  className?: string;
  children: React.ReactNode;
}

function PlaceTab({ to, active, shortcut, className, children }: PlaceTabProps) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-full items-center transition-colors hover:text-white',
        LABEL,
        active ? 'text-white' : MUTED,
        className,
      )}
      title={shortcut}
      to={to}
    >
      {children}
    </Link>
  );
}

function SearchPill() {
  const openGlobalSearch = useOpenGlobalSearch();

  if (!openGlobalSearch) {
    return null;
  }

  return (
    <button
      className={cn(
        'flex h-7 w-full max-w-[480px] cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 backdrop-blur-sm transition-colors hover:bg-white/10',
        'shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-white)_8%,transparent),inset_0_-1px_0_color-mix(in_oklab,var(--color-black)_20%,transparent)]',
      )}
      title="Search"
      type="button"
      onClick={openGlobalSearch}
    >
      <LucideIcon.Search className={cn('size-3.5 shrink-0', MUTED)} strokeWidth={1.75} />
      <span className={cn('flex-1 text-left', LABEL, MUTED)}>Search</span>
      <span className={cn(LABEL, MUTED)}>{searchShortcutLabel}</span>
    </button>
  );
}

/** Today's date and the time, its colon blinking */
function Clock() {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return (
    <div className={cn('flex items-center gap-2', LABEL, MUTED)}>
      <span>{date}</span>
      <time dateTime={now.toISOString()}>
        {hours}
        <span className="motion-safe:animate-[admin-frame-blink_1s_infinite]">:</span>
        {minutes}
      </time>
    </div>
  );
}

function Stat({ label, to, children }: { label: string; to: string; children: React.ReactNode }) {
  return (
    <Link className={cn('group flex h-full items-center gap-1', LABEL)} to={to}>
      <span className={cn('transition-colors group-hover:text-white', MUTED)}>{label}</span>
      <span className="text-white">{children}</span>
    </Link>
  );
}

/**
 * The frame's top bar: places on the left, search in the middle, and the
 * time and the site's numbers on the right. A three-column grid, so search
 * stays centred whatever is either side of it.
 */
export function AdminFrameTopBar() {
  const { pathname } = useLocation();
  const stats = useFrameStats();
  const isViewSite = pathname === '/site';
  usePlaceShortcuts();

  const mrr = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: stats.currency,
    maximumFractionDigits: 0,
  }).format(stats.mrr / 100);

  return (
    <div className="grid h-full grid-cols-3 items-center">
      <nav aria-label="Places" className="flex h-full items-center gap-6 pl-6">
        <PlaceTab active={!isViewSite} className="font-semibold" shortcut="Option + 1" to="/">
          Ghost
        </PlaceTab>
        <PlaceTab active={isViewSite} shortcut="Option + 2" to="/site">
          View site
        </PlaceTab>
      </nav>
      <div className="flex justify-center">
        <SearchPill />
      </div>
      <div className="flex h-full items-center justify-end gap-5 pr-6">
        <Clock />
        <Link className={cn('group flex h-full items-center gap-2', LABEL)} to="/analytics">
          <span aria-hidden="true" className="block size-2 bg-green" />
          <span className={cn('transition-colors group-hover:text-white', MUTED)}>
            {formatNumber(stats.online)} Online
          </span>
        </Link>
        <Stat label="Members" to="/analytics/growth">
          {formatNumber(stats.members)}
        </Stat>
        <Stat label="MRR" to="/analytics/growth?tab=mrr">
          {mrr}
        </Stat>
      </div>
    </div>
  );
}
