import { useState } from 'react';
import type { EmailDebugBatch } from '@tryghost/admin-x-framework/api/emails';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { formatDebugDate, statusLabel } from './format';

const STATUS_BADGE = {
  submitted: 'success',
  failed: 'destructive',
  pending: 'secondary',
  submitting: 'secondary',
} as const;

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

function summary(batches: EmailDebugBatch[], failed: number) {
  const total = `${formatNumber(batches.length)} ${batches.length === 1 ? 'batch' : 'batches'}`;
  if (failed > 0) {
    return `${formatNumber(failed)} of ${total} failed`;
  }
  if (batches.every((batch) => batch.status === 'submitted')) {
    return `${total}, all submitted`;
  }
  return total;
}

export default function Batches({
  batches,
  isLoading,
  isError,
}: {
  batches: EmailDebugBatch[];
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return null;
  }
  if (isError) {
    return <p role="alert">Could not load email batches.</p>;
  }
  if (!batches.length) {
    return <p className="text-muted-foreground">No batch data.</p>;
  }
  const failed = batches.filter((batch) => batch.status === 'failed').length;

  return (
    <Stack gap="md">
      <Text size="sm" tone="secondary">
        {summary(batches, failed)}.
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
                <Badge variant={STATUS_BADGE[batch.status]}>{statusLabel(batch.status)}</Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">
                {formatDebugDate(batch.created_at)}
              </TableCell>
              <TableCell className="max-w-xs break-words whitespace-normal">
                {batch.member_segment || 'All'}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatNumber(batch.count?.recipients ?? 0)}
              </TableCell>
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
