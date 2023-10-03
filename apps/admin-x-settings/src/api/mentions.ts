import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery} from '../utils/api/hooks';

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

export const useBrowseMentions = createInfiniteQuery<MentionsResponseType>({
    dataType,
    path: '/mentions/',
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<MentionsResponseType>;
        let mentions = pages.flatMap(page => page.mentions);

        // Remove duplicates
        mentions = mentions.filter((mention, index) => {
            return mentions.findIndex(({id}) => id === mention.id) === index;
        });

        return {
            mentions,
            meta: pages[pages.length - 1].meta
        };
    }
});
