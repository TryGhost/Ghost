import { type CSSProperties, type ReactNode } from 'react';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';

const GHOST_ORB = 'https://static.ghost.org/v4.0.0/images/ghost-orb-2.png';

/**
 * Full-page frame for the auth screens. Settings are unreadable before sign
 * in, so the site's accent colour comes from the public site payload here.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { data } = useBrowseSite({ defaultErrorHandler: false });
  const accentColor = data?.site.accent_color;

  return (
    <div
      className="flex min-h-screen w-full justify-center overflow-y-auto bg-background px-6 [--control-height:calc(var(--spacing)*12)]"
      style={accentColor ? ({ '--accent-color': accentColor } as CSSProperties) : undefined}
    >
      <Stack className="w-full max-w-lg py-12 sm:py-20" gap="xl">
        {children}
      </Stack>
    </div>
  );
}

export function AuthHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  const { data } = useBrowseSite({ defaultErrorHandler: false });

  return (
    <header className="mb-4 flex flex-col items-center gap-5 text-center">
      <img alt="" className="size-18 rounded-sm" src={data?.site.icon || GHOST_ORB} />
      <h1 className="text-4xl leading-tight font-bold tracking-tight text-foreground">{title}</h1>
      {children}
    </header>
  );
}

/** The line under a form that carries its error, or a confirmation. */
export function FlowMessage({ error, children }: { error?: boolean; children?: ReactNode }) {
  return (
    <p
      className={cn(
        'min-h-5 text-center text-sm',
        error ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {children}&nbsp;
    </p>
  );
}

export type SubmitState = 'idle' | 'running' | 'failed';

/**
 * The form's submit button: a spinner while the request runs (kept through a
 * successful submit until the page reloads), and "Retry" after a failure.
 * `accent` buttons use the site accent colour and turn red on failure.
 */
export function SubmitButton({
  state,
  label,
  runningLabel,
  accent = false,
  showRetry = true,
}: {
  state: SubmitState;
  label: string;
  runningLabel?: string;
  accent?: boolean;
  showRetry?: boolean;
}) {
  const failed = showRetry && state === 'failed';

  return (
    <Button
      className={cn(
        'mt-4 h-(--control-height) w-full',
        accent && !failed && 'bg-ghostaccent text-primary-foreground hover:bg-ghostaccent/90',
      )}
      disabled={state === 'running'}
      size="lg"
      type="submit"
      variant={failed && accent ? 'destructive' : 'default'}
    >
      {state === 'running' ? (
        <>
          <LoadingIndicator color="light" size="sm" />
          {runningLabel ?? <span className="sr-only">{label}</span>}
        </>
      ) : failed ? (
        'Retry'
      ) : (
        label
      )}
    </Button>
  );
}
