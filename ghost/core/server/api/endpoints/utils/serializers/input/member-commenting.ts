import type { Frame } from '@tryghost/api-framework';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';

const messages = {
  invalidExpiresAt: 'expires_at must be a valid ISO 8601 date string',
};

type CommentingFrame = Frame<{
  data: {
    expires_at?: string | Date | null;
  };
}>;

// module.exports required - using `export` causes the module to fail to register
// with the serializer layer as it's loaded via require()
module.exports = {
  disable(_apiConfig: unknown, frame: CommentingFrame): void {
    if (frame.data.expires_at !== undefined && frame.data.expires_at !== null) {
      const parsed = new Date(frame.data.expires_at);
      if (isNaN(parsed.getTime())) {
        throw new errors.ValidationError({
          message: tpl(messages.invalidExpiresAt),
          property: 'expires_at',
        });
      }
      frame.data.expires_at = parsed;
    }
  },
};
