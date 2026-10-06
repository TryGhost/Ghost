import React from 'react';
import { Grid, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';

const DOCS_URL = 'https://docs.ghost.org/';
const FEEDBACK_URL = 'https://forum.ghost.org';

const cardClass =
  'block w-full rounded-xl border border-border bg-card p-6 text-left transition-all hover:shadow-xs hover:bg-table-row-hover group/card';

interface HelpCardProps {
  url: string;
  title: string;
  description: string;
  tileClassName: string;
  icon: React.ReactNode;
}

const HelpCard: React.FC<HelpCardProps> = ({ url, title, description, tileClassName, icon }) => (
  <a className={cardClass} href={url} rel="noreferrer" target="_blank">
    <div className="flex items-center gap-6">
      <div
        className={cn(
          'flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md p-4 opacity-80 transition-all group-hover/card:opacity-100',
          tileClassName,
        )}
      >
        {icon}
      </div>
      <Stack className="gap-0.5 leading-tight">
        <Text size="md" weight="semibold">
          {title}
        </Text>
        <Text size="sm" tone="secondary">
          {description}
        </Text>
      </Stack>
    </div>
  </a>
);

const AppsHelpCards: React.FC = () => (
  <Grid className="mt-auto grid-cols-1 pt-10 lg:grid-cols-2" gap="xl">
    <HelpCard
      description="Learn how apps work in Ghost, and how to build and install your own."
      icon={<LucideIcon.Code className="text-[#3B82F6]" size={20} strokeWidth={1.5} />}
      tileClassName="bg-gradient-to-tr from-[#3B82F6]/20 to-[#14B8A6]/20"
      title="Build your own app"
      url={DOCS_URL}
    />
    <HelpCard
      description="Tell us what’s working and what’s missing — your input shapes what we build next."
      icon={<LucideIcon.MessageCircle className="text-[#0EA5E9]" size={20} strokeWidth={1.5} />}
      tileClassName="bg-gradient-to-tl from-[#10B981]/20 to-[#0EA5E9]/20"
      title="Share your feedback"
      url={FEEDBACK_URL}
    />
  </Grid>
);

export default AppsHelpCards;
