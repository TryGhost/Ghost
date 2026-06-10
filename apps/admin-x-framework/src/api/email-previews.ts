import {createQueryWithId} from '../utils/api/hooks';

export type EmailPreview = {
    html?: string | null;
    plaintext?: string | null;
    subject?: string | null;
};

export interface EmailPreviewResponseType {
    email_previews: EmailPreview[];
}

// GET /email_previews/posts/:id/ — the same Admin API endpoint Ember's editor
// preview modal uses (ghost/admin/app/components/editor/modals/preview/email.js).
// Accepts `memberSegment` (NQL filter, e.g. 'status:free') and `newsletter`
// (newsletter slug) search params.
export const getPostEmailPreview = createQueryWithId<EmailPreviewResponseType>({
    dataType: 'EmailPreviewResponseType',
    path: id => `/email_previews/posts/${id}/`
});
