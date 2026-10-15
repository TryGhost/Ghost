import type { Controller, Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import { z } from 'zod';
import supportRequests, { type SupportRequest } from '../../services/support-requests';

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();
const optionalUrl = z
  .url({ protocol: /^https?$/ })
  .max(2048)
  .nullable()
  .optional();

const SupportRequestInput = z
  .object({
    name: requiredText(191),
    email: z.email().max(191),
    subject: requiredText(255),
    message: requiredText(10_000),
    source: z
      .string()
      .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/)
      .max(50)
      .nullable()
      .optional(),
    page_url: optionalUrl,
    conversation_url: optionalUrl,
    transcript: optionalText(100_000),
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

function requester(frame: AddFrame): { id: string; email: string } {
  const user = frame.user;

  if (user && typeof user === 'object' && 'get' in user && typeof user.get === 'function') {
    const id: unknown = user.get('id');
    const email: unknown = user.get('email');

    if (typeof id === 'string' && typeof email === 'string') {
      return { id, email };
    }
  }

  throw new errors.NoPermissionError({
    message: 'Support requests can only be sent by a staff user',
  });
}

function toSupportRequest(
  input: z.infer<typeof SupportRequestInput>,
  staffUser: { id: string; email: string },
): SupportRequest {
  return {
    requestedByUserId: staffUser.id,
    requestedByEmail: staffUser.email,
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
    source: input.source ?? null,
    pageUrl: input.page_url ?? null,
    conversationUrl: input.conversation_url ?? null,
    transcript: input.transcript ?? null,
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
