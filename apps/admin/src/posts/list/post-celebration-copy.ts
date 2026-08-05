import {formatNumber} from '@tryghost/shade/utils';

/**
 * Headings for the post-publish celebration, ported from the `<h1>` in
 * `apps/ember-admin/app/components/modal-post-success.hbs`.
 *
 * A scheduled post gets one line; everything else gets two, and which second
 * line you get depends on the resource, whether it was email-only, and whether
 * the published count was fetched in time.
 */

export interface CelebrationCopyInputs {
    wasPublished: boolean;
    /** 'post' or 'page', as the editor wrote it. */
    type: string;
    emailOnly?: boolean;
    /** Total published posts. Absent if the count request hasn't landed. */
    postCount?: number;
}

export function getCelebrationCopy({
    wasPublished, type, emailOnly, postCount
}: CelebrationCopyInputs): {primary: string; secondary: string} {
    if (!wasPublished) {
        return {primary: 'All set!', secondary: ''};
    }

    const showCount = typeof postCount === 'number';
    const primary = showCount ? 'Boom! It’s out there.' : 'Your post is published.';

    if (type === 'page') {
        return {primary, secondary: 'Your page is published.'};
    }

    if (emailOnly) {
        return {primary, secondary: 'Your email has been sent.'};
    }

    if (showCount) {
        const noun = postCount === 1 ? 'post' : 'posts';

        return {primary, secondary: `That’s ${formatNumber(postCount)} ${noun} published.`};
    }

    return {primary, secondary: 'Spread the word!'};
}
