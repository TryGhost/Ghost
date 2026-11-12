import type { Frame } from '@tryghost/api-framework';

type EmailsFrame = Frame<{ options: { withRelated?: string[] } }>;

module.exports = {
  browseFailures(apiConfig: unknown, frame: EmailsFrame) {
    if (!frame.options.withRelated) {
      return;
    }

    // Fix snake case API <-> internal camelCase
    frame.options.withRelated = frame.options.withRelated.map((r) => {
      if (r === 'email_recipient') {
        return 'emailRecipient';
      }
      return r;
    });
  },
};
