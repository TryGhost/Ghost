import KpiCard, {
  KpiCardContent,
  KpiCardLabel,
  KpiCardValue,
} from '@/posts/analytics/components/kpi-card';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@tryghost/shade/components';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import {
  type DeliverySimModel,
  type DeliverySimState,
  SIM_STATES,
  formatSentDate,
} from '@/posts/analytics/newsletter/hooks/use-delivery-simulator';

// Prototype: simulated email delivery status UI for the post analytics
// newsletter tab. State machine and number model live in
// hooks/use-delivery-simulator.ts.

interface DeliveryStatusRowProps {
  state: DeliverySimState;
  progress: number;
  model: DeliverySimModel;
  publishedAt?: string;
}

export const DeliveryStatusRow: React.FC<DeliveryStatusRowProps> = ({
  state,
  progress,
  model,
  publishedAt,
}) => {
  if (state === 'off') {
    return null;
  }

  if (state === 'publishing' || state === 'sending') {
    return (
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <LucideIcon.Send size={15} strokeWidth={1.5} />
          {state === 'publishing' ? (
            <span>Sending your email to {formatNumber(model.audience)} subscribers…</span>
          ) : (
            <span>Sending your email · {progress}% sent</span>
          )}
        </div>
        <div className="relative mt-2.5 h-1 overflow-hidden rounded-full bg-muted">
          {state === 'publishing' ? (
            <>
              <style>{`@keyframes delivery-indeterminate { 0% { left: -33%; } 100% { left: 100%; } }`}</style>
              <div
                className="absolute h-full w-1/3 rounded-full bg-green"
                style={{ animation: 'delivery-indeterminate 1.6s ease-in-out infinite' }}
              />
            </>
          ) : (
            <div
              className="h-full rounded-full bg-green transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>
      </div>
    );
  }

  // The "delivering" period (and a lagging-analytics day) renders with the
  // final "Sent" row — delivery is analytics, never a status.
  if (state === 'sent' || state === 'delivering' || state === 'lagging') {
    return (
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <LucideIcon.Check className="text-green" size={15} strokeWidth={2} />
          <span>
            Sent {formatSentDate(publishedAt)} to {formatNumber(model.audience)} subscribers
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border px-6 py-4">
      <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <LucideIcon.CircleAlert className="mt-0.5 shrink-0 text-destructive" size={15} />
        <p className="leading-relaxed">
          {state === 'failed-partial' ? (
            <>
              <span className="font-medium text-foreground">
                This email didn&apos;t send to everyone.
              </span>{' '}
              It was only sent to {formatNumber(model.sent)} of {formatNumber(model.audience)}{' '}
              subscribers. Something went wrong on our side — our team has been notified and will be
              in touch. You don&apos;t need to do anything.
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">This email didn&apos;t send.</span>{' '}
              Something went wrong on our side — our team has been notified and will be in touch.
              You don&apos;t need to do anything.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

const formatWatermarkTime = (lagMinutes: number): string => {
  return new Date(Date.now() - lagMinutes * 60 * 1000)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
    .replace(' ', '');
};

interface SimulatedKpiRowProps {
  state: DeliverySimState;
  model: DeliverySimModel;
  showOpened: boolean;
  showClicked: boolean;
}

// While the send is in flight (or never happened) the cards sit in a pending
// state; numbers only ever appear once the send has settled.
export const SimulatedKpiRow: React.FC<SimulatedKpiRowProps> = ({
  state,
  model,
  showOpened,
  showClicked,
}) => {
  // During "sending" the cards fill live — real counts already exist and the
  // strip above labels them as still moving. Dashes only before any data
  // exists (just published) or when nothing was ever sent.
  const pending = state === 'publishing' || state === 'failed-all';
  const columns = 1 + (showOpened ? 1 : 0) + (showClicked ? 1 : 0);
  const gridClass = columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1';

  const value = (count: number) =>
    pending ? <span className="text-muted-foreground/50">—</span> : formatNumber(count);

  return (
    <div className={`grid ${gridClass} items-stretch border-b`}>
      <KpiCard className={cn('p-3 md:px-6 md:py-5', pending && 'opacity-60')}>
        <KpiCardLabel>
          <div className="ml-0.5 size-[9px] rounded-full bg-chart-purple opacity-50"></div>
          Delivered
        </KpiCardLabel>
        <KpiCardContent>
          <KpiCardValue className="text-xl leading-none sm:text-2xl md:text-[2.6rem]">
            {value(model.delivered)}
          </KpiCardValue>
          {!pending && model.failed > 0 && (
            <div className="mt-1.5 text-sm text-muted-foreground">
              {formatNumber(model.failed)} failed
            </div>
          )}
        </KpiCardContent>
      </KpiCard>

      {showOpened && (
        <KpiCard className={cn('p-3 md:px-6 md:py-5', pending && 'opacity-60')}>
          <KpiCardLabel>
            <div className="ml-0.5 size-[9px] rounded-full bg-chart-blue opacity-50"></div>
            Opened
            {state === 'lagging' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground">
                    <LucideIcon.Clock size={14} strokeWidth={1.5} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Opens counted up to {formatWatermarkTime(8 * 60)}. Analytics are catching up — no
                  action needed.
                </TooltipContent>
              </Tooltip>
            )}
          </KpiCardLabel>
          <KpiCardContent>
            <KpiCardValue className="text-xl leading-none sm:text-2xl md:text-[2.6rem]">
              {value(model.opened)}
            </KpiCardValue>
          </KpiCardContent>
        </KpiCard>
      )}

      {showClicked && (
        <KpiCard className={cn('p-3 md:px-6 md:py-5', pending && 'opacity-60')}>
          <KpiCardLabel>
            <div className="ml-0.5 size-[9px] rounded-full bg-chart-teal opacity-50"></div>
            Clicked
          </KpiCardLabel>
          <KpiCardContent>
            <KpiCardValue className="text-xl leading-none sm:text-2xl md:text-[2.6rem]">
              {value(model.clicked)}
            </KpiCardValue>
          </KpiCardContent>
        </KpiCard>
      )}
    </div>
  );
};

interface DeliverySimulatorControlProps {
  state: DeliverySimState;
  onChange: (state: DeliverySimState) => void;
}

export const DeliverySimulatorControl: React.FC<DeliverySimulatorControlProps> = ({
  state,
  onChange,
}) => {
  return (
    <div className="fixed right-6 bottom-6 z-50 rounded-lg border border-border-default bg-surface-elevated p-3 shadow-md">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        Prototype · simulate delivery state
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SIM_STATES.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={state === option.value ? 'default' : 'outline'}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
