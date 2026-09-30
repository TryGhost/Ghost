import { useMemo, useState } from 'react';
import type { EmailRecipientFailure } from '@tryghost/admin-x-framework/api/emails';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsTriggerCount,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { type FailureGroup, groupFailures } from './group-failures';

const RECIPIENTS_PER_PAGE = 20;

type Filter = 'all' | EmailRecipientFailure['severity'];

function initials(value: string) {
  return (value || 'U')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Recipient({
  failure,
  groupMessage,
}: {
  failure: EmailRecipientFailure;
  groupMessage: string;
}) {
  const name = failure.email_recipient?.member_name || '';
  const email = failure.email_recipient?.member_email || '';
  const identity = (
    <Inline align="center" gap="md">
      <Avatar className="size-8">
        <AvatarImage src={failure.member?.avatar_image || undefined} />
        <AvatarFallback>{initials(name || email)}</AvatarFallback>
      </Avatar>
      <Stack gap="none">
        <span className="font-medium">{name || email}</span>
        {name && <span className="text-muted-foreground">{email}</span>}
      </Stack>
    </Inline>
  );
  return (
    <Stack className="py-2" gap="xs">
      {failure.member?.id ? <a href={`#/members/${failure.member.id}`}>{identity}</a> : identity}
      {failure.message !== groupMessage && (
        <Text className="pl-11 break-words" size="sm" tone="secondary">
          {failure.message}
        </Text>
      )}
    </Stack>
  );
}

function FailureGroupItem({ group, showSeverity }: { group: FailureGroup; showSeverity: boolean }) {
  const [visible, setVisible] = useState(RECIPIENTS_PER_PAGE);
  const count = group.failures.length;
  const remaining = count - visible;
  const code = group.enhancedCode ? `${group.code} · ${group.enhancedCode}` : String(group.code);

  return (
    <AccordionItem value={group.key}>
      <AccordionTrigger className="group gap-3 hover:no-underline">
        <Inline align="center" className="min-w-0 grow" gap="sm" wrap>
          <Badge
            className="shrink-0 font-mono"
            variant={group.severity === 'permanent' ? 'destructive' : 'warning'}
          >
            {code}
          </Badge>
          <span className="order-last line-clamp-1 min-w-0 basis-full font-normal break-words group-data-[state=open]:line-clamp-none group-data-[state=open]:whitespace-pre-wrap sm:order-none sm:grow sm:basis-0">
            {group.message}
          </span>
          <Text as="span" className="shrink-0 max-sm:grow" size="sm" tone="secondary">
            {formatNumber(count)} {count === 1 ? 'recipient' : 'recipients'}
            {showSeverity && ` · ${group.severity}`}
          </Text>
        </Inline>
      </AccordionTrigger>
      <AccordionContent>
        <div className="divide-y">
          {group.failures.slice(0, visible).map((failure) => (
            <Recipient key={failure.id} failure={failure} groupMessage={group.message} />
          ))}
        </div>
        {remaining > 0 && (
          <Button
            className="mt-2"
            size="sm"
            variant="ghost"
            onClick={() => setVisible(visible + RECIPIENTS_PER_PAGE)}
          >
            Show {formatNumber(Math.min(remaining, RECIPIENTS_PER_PAGE))} more
          </Button>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

/** Recipient failures grouped by provider response. */
export default function Failures({
  failures,
  isLoading,
  isError,
}: {
  failures: EmailRecipientFailure[];
  isLoading: boolean;
  isError: boolean;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const permanent = failures.filter((failure) => failure.severity === 'permanent').length;
  const temporary = failures.length - permanent;
  const mixed = permanent > 0 && temporary > 0;
  const groups = useMemo(
    () =>
      groupFailures(
        mixed && filter !== 'all'
          ? failures.filter((failure) => failure.severity === filter)
          : failures,
      ),
    [failures, filter, mixed],
  );

  if (isLoading) {
    return null;
  }
  if (isError) {
    return <p role="alert">Could not load recipient failures.</p>;
  }
  if (!failures.length) {
    return <p className="text-muted-foreground">No recipient failures.</p>;
  }

  return (
    <Stack gap="md">
      <Inline align="center" gap="md" justify="between" wrap>
        <Text size="sm" tone="secondary">
          {formatNumber(failures.length)} {failures.length === 1 ? 'recipient' : 'recipients'},
          grouped by provider response.
        </Text>
        {mixed && (
          <Tabs value={filter} variant="pill" onValueChange={(value) => setFilter(value as Filter)}>
            <TabsList className="h-auto flex-wrap gap-1">
              <TabsTrigger value="all">
                All
                <TabsTriggerCount>{formatNumber(failures.length)}</TabsTriggerCount>
              </TabsTrigger>
              <TabsTrigger value="permanent">
                Permanent
                <TabsTriggerCount>{formatNumber(permanent)}</TabsTriggerCount>
              </TabsTrigger>
              <TabsTrigger value="temporary">
                Temporary
                <TabsTriggerCount>{formatNumber(temporary)}</TabsTriggerCount>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </Inline>
      <Accordion key={filter} className="border-t" defaultValue={[groups[0].key]} type="multiple">
        {groups.map((group) => (
          <FailureGroupItem
            key={group.key}
            group={group}
            showSeverity={mixed && filter === 'all'}
          />
        ))}
      </Accordion>
    </Stack>
  );
}
