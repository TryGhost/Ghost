import {Meta, createPaginatedQuery} from '../utils/apiRequests';

export type Mention = {
    id: string;
    source: string;
    source_title: string|null;
    source_site_title: string|null;
    source_excerpt: string|null;
    source_author: string|null;
    source_featured_image: string|null;
    source_favicon: string|null;
    target: string;
    verified: boolean;
    created_at: string;
};

export interface MentionsResponseType {
    meta?: Meta
    mentions: Mention[];
}

const dataType = 'MentionsResponseType';

export const useBrowseMentions = createPaginatedQuery<MentionsResponseType>({
    dataType,
    path: '/mentions/'
});
