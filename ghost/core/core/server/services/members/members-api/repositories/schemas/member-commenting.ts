import {z} from 'zod';
import {MemberCommenting} from '../../../commenting/member-commenting';
import {JsonStringCodec, isoDatetimeString} from '../../../../../lib/zod/codecs';

/** All fields optional with defaults to handle empty JSON `{}`. Invalid dates trigger fail-open. */
const DBShape = z.object({
    disabled: z.boolean().optional().default(false),
    disabledReason: z.string().nullable().optional().default(null),
    disabledUntil: isoDatetimeString.nullable().optional().default(null)
});

const defaultCommenting = new MemberCommenting(false, null, null);

const MemberCommentingObjectCodec = z.codec(
    DBShape,
    z.custom<MemberCommenting>(),
    {
        decode: data => new MemberCommenting(
            data.disabled,
            data.disabledReason,
            data.disabledUntil ? new Date(data.disabledUntil) : null
        ),
        encode: c => ({
            disabled: c.disabled,
            disabledReason: c.disabledReason,
            disabledUntil: c.disabledUntil?.toISOString() ?? null
        })
    }
);

export const MemberCommentingDBCodec = JsonStringCodec.pipe(MemberCommentingObjectCodec);

export {defaultCommenting};
