import React from 'react';
import { Card, CardContent } from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Member detail's section shape (members/detail/member-detail.tsx): a
// section-heading title, an optional action beside it, then the content
// under a single hairline (Card's `ruled` variant), no box, no padding.
//
// A section with somewhere to go (`href`, its tab) works like the Analytics
// Overview's stat cards (exploration-1/overview-kpis.tsx): the title is the
// link, and hovering the section raises a right arrow after it, through a
// mask. Sections mark themselves `group/section` for it.

// The arrow, hidden below its mask until the section is hovered or has focus
const HoverArrow: React.FC = () => (
  <span aria-hidden="true" className="flex size-4 shrink-0 overflow-hidden">
    <LucideIcon.ArrowRight className="size-4 translate-y-full stroke-[1.5px] text-foreground transition-transform duration-200 ease-out group-focus-within/section:translate-y-0 group-hover/section:translate-y-0 motion-reduce:transition-none" />
  </span>
);

export const SectionTitle: React.FC<{
  id: string;
  title: string;
  href?: string;
  className?: string;
}> = ({ id, title, href, className }) => (
  <h3 className={cn('section-heading text-base font-semibold', className)} id={id}>
    {href ? (
      <a className="inline-flex items-center gap-1.5 rounded-sm" href={href}>
        {title}
        <HoverArrow />
      </a>
    ) : (
      title
    )}
  </h3>
);

export const Section: React.FC<{
  id: string;
  title: string;
  href?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}> = ({ id, title, href, action, children, testId }) => (
  <section aria-labelledby={id} className="group/section flex flex-col gap-3" data-testid={testId}>
    <div className="flex flex-wrap items-center justify-between gap-x-4">
      <SectionTitle href={href} id={id} title={title} />
      {action}
    </div>
    <Card variant="ruled">
      <CardContent>{children}</CardContent>
    </Card>
  </section>
);

// A number with its label above: member detail's stat-label and stat-value
export const Stat: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}> = ({ label, children, className, testId }) => (
  <div className={`flex flex-col gap-2 ${className ?? ''}`} data-testid={testId}>
    <p className="stat-label text-muted-foreground">{label}</p>
    <p className="stat-value text-2xl font-semibold">{children}</p>
  </div>
);
