import {z} from 'zod';
import type {MemberCommenting} from '../../../../../../services/members/commenting/member-commenting';

// Transform: MemberCommenting domain -> API response (snake_case)
export const MemberCommentingResponseSchema = z
    .custom<MemberCommenting>()
    .transform(c => ({
        disabled: c.disabled,
        disabled_reason: c.disabledReason,
        disabled_until: c.disabledUntil?.toISOString() ?? null
    }));

export type MemberCommentingResponse = z.output<typeof MemberCommentingResponseSchema>;
