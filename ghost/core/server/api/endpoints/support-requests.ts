import type { Controller, Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import { z } from 'zod';
import supportRequests, { type SupportRequest } from '../../services/support-requests';

const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalUrl = z
  .url({ protocol: /^https?$/ })
  .max(2048)
  .nullable()
  .optional();

const SupportRequestContext = z.record(z.string().regex(SLUG), z.string().trim().min(1));

const SupportRequestInput = z
  .object({
    subject: requiredText(255),
    message: requiredText(10_000),
    source: z.string().regex(SLUG).max(50).nullable().optional(),
    page_url: optionalUrl,
    context: SupportRequestContext.nullable().optional(),
  })
  .strict();

const SupportRequestBody = z.object({
  support_requests: z.tuple([SupportRequestInput]),
});

type AddFrame = Frame<{ data: { support_requests: unknown } }>;

function parseSupportRequest(frame: AddFrame) {
  const result = SupportRequestBody.safeParse(frame.data);

  if (!result.success) {
    const [issue] = result.error.issues;
    const field = issue.path.slice(2).join('.');

    throw new errors.ValidationError({
      message: field ? `Invalid ${field}: ${issue.message}` : 'Invalid support request',
    });
  }

  return result.data.support_requests[0];
}

function requester(frame: AddFrame): SupportRequest['requestedBy'] {
  const user = frame.user;

  if (user && typeof user === 'object' && 'get' in user && typeof user.get === 'function') {
    const id: unknown = user.get('id');
    const name: unknown = user.get('name');
    const email: unknown = user.get('email');

    if (typeof id === 'string' && typeof name === 'string' && typeof email === 'string') {
      return { id, name, email };
    }
  }

  throw new errors.NoPermissionError({
    message: 'Support requests can only be sent by a staff user',
  });
}

function toSupportRequest(
  input: z.infer<typeof SupportRequestInput>,
  requestedBy: SupportRequest['requestedBy'],
): SupportRequest {
  return {
    requestedBy,
    subject: input.subject,
    message: input.message,
    source: input.source ?? null,
    pageUrl: input.page_url ?? null,
    context: input.context ?? {},
  };
}

const controller = {
  docName: 'support_requests',

  add: {
    statusCode: 202,
    headers: {
      cacheInvalidate: false,
    },
    validation(frame: AddFrame) {
      parseSupportRequest(frame);
    },
    permissions: false,
    async query(frame: AddFrame) {
      await supportRequests.service.send(
        toSupportRequest(parseSupportRequest(frame), requester(frame)),
      );
    },
  },
} satisfies Controller<{ add: AddFrame }>;

export default controller;

module.exports = controller;
