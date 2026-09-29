import logging from '@tryghost/logging';
import { z } from 'zod';
import { actorSchema, resourceSchema } from './post-presence-service';
import { getService } from './index';
// @ts-expect-error Legacy CommonJS module.
import labs from '../../../shared/labs';

const contextSchema = z.object({
  user: z.string(),
  api_key: z.null().optional(),
  internal: z.literal(false).optional(),
});
export async function recordSave(
  frame: { options: { context: unknown }; user?: { toJSON: () => unknown } },
  post: unknown,
) {
  try {
    if (
      !labs.isSet('editorPresence') ||
      !frame.user ||
      !contextSchema.safeParse(frame.options.context).success
    ) {
      return;
    }
    await getService()?.record(
      resourceSchema.parse(post),
      actorSchema.parse(frame.user.toJSON()),
      'saved',
      null,
    );
  } catch (error) {
    // A presence failure must not fail the save.
    logging.warn({ message: 'Unable to record editor presence after saving', err: error });
  }
}
