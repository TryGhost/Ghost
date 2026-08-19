// The questions the stepped publish flow asks, in the order the answers depend
// on each other: how you're publishing decides whether there's an audience to
// pick at all, and who's getting the post decides whether a preview is worth
// offering.
//
// `question` is resolved per-post rather than fixed, because the last one has
// to name what's actually happening - "published", "sent", or both.
export const PUBLISH_STEPS = [
    {
        name: 'publishType',
        question: () => 'How would you like to publish this post?',
        // names what's next on the previous step's button, so it has to read as
        // the thing itself - "email preview", not "preview"
        shortLabel: 'publishing'
    },
    {
        name: 'emailRecipients',
        question: () => 'Who would you like to email it to?',
        // "email audience", not "audience" - the button naming it sits on the
        // step that just chose between site and email, where a bare "audience"
        // reads as though it covers both
        shortLabel: 'email audience'
    },
    {
        name: 'emailPreview',
        // a "who" question, because the audience selection is the whole answer -
        // there's no yes/no in front of it to ask "whether" about
        question: () => 'Who should receive an email preview?',
        shortLabel: 'email preview'
    },
    {
        name: 'publishAt',
        question: (publishOptions) => {
            if (publishOptions?.publishType === 'send') {
                return 'When should it be sent?';
            }

            if (publishOptions?.publishType === 'publish+send') {
                return 'When should it be published and sent?';
            }

            return 'When should it be published?';
        },
        shortLabel: 'timing'
    }
];

/**
 * The steps that apply to this post.
 *
 * The audience question disappears when there's nobody to send to - either the
 * site can't email at all, or the author chose site-only publishing. The
 * preview question needs both an email and a paywall card: without a card there
 * is no preview to send, only an empty stub.
 *
 * @param {object} publishOptions
 * @returns {Array<{name: string, question: string, shortLabel: string}>}
 */
export function visiblePublishSteps(publishOptions) {
    const willEmail = !publishOptions?.emailUnavailable && publishOptions?.publishType !== 'publish';

    return PUBLISH_STEPS
        .filter((step) => {
            if (step.name === 'emailRecipients') {
                return willEmail;
            }

            if (step.name === 'emailPreview') {
                return willEmail && !!publishOptions?.hasAudienceSplit;
            }

            return true;
        })
        .map(step => Object.assign({}, step, {question: step.question(publishOptions)}));
}

/**
 * Progress dots for a screen in the flow, including the final review as the
 * last dot so the row reflects the whole journey.
 *
 * @param {object} publishOptions
 * @param {number} currentIndex - -1 for "past every question", i.e. the review
 * @returns {Array<{isCurrent: boolean, isComplete: boolean}>}
 */
export function publishFlowDots(publishOptions, currentIndex) {
    const total = visiblePublishSteps(publishOptions).length + 1;
    const current = currentIndex < 0 ? total - 1 : currentIndex;

    return Array.from({length: total}, (_, index) => ({
        isCurrent: index === current,
        isComplete: index < current
    }));
}
