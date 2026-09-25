import { useMemo, useState } from 'react';
import type {
  EmailDebugBatch,
  EmailRecipientFailure,
} from '@tryghost/admin-x-framework/api/emails';
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
  LoadingIndicator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TabsTriggerCount,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { formatDebugDate, statusLabel } from './format';
import { type FailureGroup, groupFailures } from './group-failures';

const RECIPIENTS_PER_PAGE = 20;

const BATCH_STATUS_BADGE = {
  submitted: 'success',
  failed: 'destructive',
  pending: 'secondary',
  submitting: 'secondary',
} as const;

interface QueryState {
  isLoading: boolean;
  isError: boolean;
}

function Empty({ children }: { children: string }) {
  return <p className="py-10 text-center text-muted-foreground">{children}</p>;
}

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
        <Stack gap="sm">
          <div className="divide-y">
            {group.failures.slice(0, visible).map((failure) => (
              <Recipient key={failure.id} failure={failure} groupMessage={group.message} />
            ))}
          </div>
          {remaining > 0 && (
            <Button
              className="self-start"
              size="sm"
              variant="ghost"
              onClick={() => setVisible(visible + RECIPIENTS_PER_PAGE)}
            >
              Show {formatNumber(Math.min(remaining, RECIPIENTS_PER_PAGE))} more
            </Button>
          )}
        </Stack>
      </AccordionContent>
    </AccordionItem>
  );
}

function FailureGroups({
  failures,
  emptyLabel,
  showSeverity,
}: {
  failures: EmailRecipientFailure[];
  emptyLabel: string;
  showSeverity: boolean;
}) {
  const groups = useMemo(() => groupFailures(failures), [failures]);
  if (!groups.length) {
    return <Empty>{emptyLabel}</Empty>;
  }
  return (
    <Accordion defaultValue={[groups[0].key]} type="multiple">
      {groups.map((group) => (
        <FailureGroupItem key={group.key} group={group} showSeverity={showSeverity} />
      ))}
    </Accordion>
  );
}

function BatchError({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Stack gap="xs">
      <p className={expanded ? 'break-words whitespace-pre-wrap' : 'line-clamp-2 break-words'}>
        {message}
      </p>
      <Button
        aria-expanded={expanded}
        className="self-start"
        size="sm"
        variant="ghost"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Show less' : 'Show full error'}
      </Button>
    </Stack>
  );
}

function Batches({ batches, failed }: { batches: EmailDebugBatch[]; failed: number }) {
  if (!batches.length) {
    return <Empty>No batch data.</Empty>;
  }
  return (
    <Stack gap="md">
      <Text size="sm" tone="secondary">
        {formatNumber(failed)} of {formatNumber(batches.length)}{' '}
        {batches.length === 1 ? 'batch' : 'batches'} failed.
      </Text>
      <Table>
        <TableHeader>
          <TableRow>
            {['Status', 'Created', 'Segment', 'Recipients', 'Details'].map((label) => (
              <TableHead key={label}>{label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell>
                <Badge variant={BATCH_STATUS_BADGE[batch.status] ?? 'secondary'}>
                  {statusLabel(batch.status)}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDebugDate(batch.created_at)}
              </TableCell>
              <TableCell className="max-w-xs break-words whitespace-normal">
                {batch.member_segment || 'N/A'}
              </TableCell>
              <TableCell>{formatNumber(batch.count?.recipients ?? 0)}</TableCell>
              <TableCell className="max-w-xl break-words whitespace-normal">
                <Stack gap="sm">
                  {batch.mailgun_message_id && (
                    <span>
                      Provider id: <code>{batch.mailgun_message_id}</code>
                    </span>
                  )}
                  {!!batch.error_status_code && (
                    <span>Failure status code: {batch.error_status_code}</span>
                  )}
                  {batch.error_message && <BatchError message={batch.error_message} />}
                  {!batch.mailgun_message_id &&
                    !batch.error_status_code &&
                    !batch.error_message &&
                    'N/A'}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}

export default function Problems({
  failures,
  failuresState,
  batches,
  batchesState,
}: {
  failures: EmailRecipientFailure[];
  failuresState: QueryState;
  batches: EmailDebugBatch[];
  batchesState: QueryState;
}) {
  const permanent = failures.filter((failure) => failure.severity === 'permanent');
  const temporary = failures.filter((failure) => failure.severity === 'temporary');
  const failedBatches = batches.filter((batch) => batch.status === 'failed').length;
  const views = [
    { value: 'all', label: 'All failures', failures, empty: 'No failures.' },
    {
      value: 'permanent',
      label: 'Permanent',
      failures: permanent,
      empty: 'No permanent failures.',
    },
    {
      value: 'temporary',
      label: 'Temporary',
      failures: temporary,
      empty: 'No temporary failures.',
    },
  ];

  return (
    <Tabs defaultValue="all" variant="pill">
      <TabsList className="mb-4 h-auto flex-wrap gap-1">
        {views.map((view) => (
          <TabsTrigger key={view.value} value={view.value}>
            {view.label}
            <TabsTriggerCount>{formatNumber(view.failures.length)}</TabsTriggerCount>
          </TabsTrigger>
        ))}
        <TabsTrigger value="batches">
          Errored batches
          <TabsTriggerCount>{formatNumber(failedBatches)}</TabsTriggerCount>
        </TabsTrigger>
      </TabsList>
      {views.map((view) => (
        <TabsContent key={view.value} value={view.value}>
          {failuresState.isLoading ? (
            <LoadingIndicator size="lg" />
          ) : failuresState.isError ? (
            <p role="alert">Could not load recipient failures.</p>
          ) : (
            <FailureGroups
              emptyLabel={view.empty}
              failures={view.failures}
              showSeverity={view.value === 'all'}
            />
          )}
        </TabsContent>
      ))}
      <TabsContent value="batches">
        {batchesState.isLoading ? (
          <LoadingIndicator size="lg" />
        ) : batchesState.isError ? (
          <p role="alert">Could not load email batches.</p>
        ) : (
          <Batches batches={batches} failed={failedBatches} />
        )}
      </TabsContent>
    </Tabs>
  );
}
