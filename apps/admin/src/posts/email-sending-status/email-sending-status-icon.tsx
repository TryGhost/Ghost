import { cn } from '@tryghost/shade/utils';
import type { ComponentPropsWithoutRef } from 'react';
import type { EmailSendingPhase } from '@tryghost/admin-x-framework/api/emails';

const RING_RADIUS = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const RingCircle = ({ className, ...props }: ComponentPropsWithoutRef<'circle'>) => (
  <circle
    className={cn('stroke-current', className)}
    cx="8"
    cy="8"
    r={RING_RADIUS}
    strokeWidth="2"
    {...props}
  />
);

interface EmailSendingStatusIconProps {
  phase: EmailSendingPhase;
  /** 0 to 1. Only used while submitting. */
  share?: number | null;
  className?: string;
}

/** A spinning arc while preparing, then a ring that fills as emails are sent. */
export function EmailSendingStatusIcon({ phase, share, className }: EmailSendingStatusIconProps) {
  if (phase === 'preparing') {
    return (
      <span
        aria-hidden="true"
        className={cn('relative size-3.5 shrink-0 text-chart-purple', className)}
      >
        <svg className="absolute inset-0 size-full" fill="none" viewBox="0 0 16 16">
          <RingCircle className="opacity-25" />
        </svg>
        {/* The mask fades the ring into a tail; its colour just needs to be opaque. */}
        <svg
          className="absolute inset-0 size-full animate-spin [mask-image:conic-gradient(transparent_25%,#000)] [animation-duration:1.5s] motion-reduce:animate-none"
          fill="none"
          viewBox="0 0 16 16"
        >
          <RingCircle />
        </svg>
      </span>
    );
  }

  const drawnShare = Math.min(1, Math.max(0, share ?? 0));

  return (
    <svg
      aria-hidden="true"
      className={cn('size-3.5 shrink-0 -rotate-90 text-chart-purple', className)}
      fill="none"
      viewBox="0 0 16 16"
    >
      <RingCircle className="opacity-25" />
      <RingCircle
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={RING_CIRCUMFERENCE * (1 - drawnShare)}
      />
    </svg>
  );
}
