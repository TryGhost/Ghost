import {createQuery} from '../utils/api/hooks';

// Types

// Where a media item is used within a resource. Mirrors the backend's field set.
export type MediaUsageField = 'feature_image' | 'body' | 'og_image' | 'twitter_image';

export type MediaUsage = {
    type: 'post' | 'page';
    id: string;
    title: string;
    status: string;
    fields: MediaUsageField[];
};

export type MediaLibraryItem = {
    url: string;
    type: 'image' | 'media' | 'file';
    filename: string;
    count: number;
    used_in: MediaUsage[];
};

export interface MediaLibraryResponseType {
    meta?: {count: number};
    media_library: MediaLibraryItem[];
}

// Requests

const dataType = 'MediaLibraryResponseType';

export const useBrowseMediaLibrary = createQuery<MediaLibraryResponseType>({
    dataType,
    path: '/media/library/'
});
