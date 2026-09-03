import { z } from 'zod';
import { snakeKeys } from '../../lib/case-keys';
import { EmailStatus } from './sending-status';

const SendingPhaseResource = z.enum(['preparing', 'submitting']);

const SendingResource = z.object({
  status: z.enum(['preparing', 'submitting', 'submitted', 'failed']),
  progress: z.object({
    completed: z.number(),
    total: z.number(),
    estimated_seconds_remaining: z.number().nullable(),
  }),
  failed_during: SendingPhaseResource.optional(),
});

const EmailStatusResource = z.object({
  id: z.string(),
  sending: SendingResource,
});

const EmailStatusesResponse = z.object({ email_statuses: z.array(EmailStatusResource) });

export const toEmailStatusesResponse = EmailStatus.transform(
  ({ id, sending }): z.input<typeof EmailStatusesResponse> => ({
    email_statuses: [
      {
        id,
        sending: {
          status: sending.status,
          progress: snakeKeys(sending.progress),
          ...(sending.status === 'failed' ? { failed_during: sending.failedDuring } : {}),
        },
      },
    ],
  }),
).pipe(EmailStatusesResponse);
