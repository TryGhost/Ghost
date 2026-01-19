import {z} from 'zod';
import {nullableIsoDatetime} from '../../../../../../lib/zod/codecs';

/**
 * Input schema for disabling member commenting.
 * - reason: Why commenting is being disabled
 * - expires_at: When the restriction expires (null = permanent)
 */
export const DisableCommentingInput = z.object({
    reason: z.string().min(1, 'reason is required'),
    expires_at: nullableIsoDatetime.optional()
});

export type DisableCommentingInputType = z.infer<typeof DisableCommentingInput>;
