import {useMutation, useQueryClient} from '@tanstack/react-query';
import {Meta, createQuery, createQueryWithId} from '../utils/api/hooks';
import {apiUrl, useFetchApi} from '../utils/api/fetch-api';
import {useFramework} from '../providers/framework-provider';

export type MediaType = 'image' | 'video' | 'audio' | 'file';
export type MediaSource = 'upload' | 'backfill' | 'reference';
export type MediaStorageType = 'images' | 'files' | 'media';

export interface MediaFileUsage {
    id: string;
    media_file_id: string;
    resource_type: string;
    resource_id: string;
    field: string;
    created_at: string;
}

export interface MediaFile {
    id: string;
    url: string;
    storage_path: string | null;
    storage_type: MediaStorageType;
    media_type: MediaType;
    mime_type: string | null;
    extension: string | null;
    name: string;
    size_bytes: number | null;
    width: number | null;
    height: number | null;
    thumbnail_url: string | null;
    source: MediaSource;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    usages?: MediaFileUsage[];
}

export interface MediaResponseType {
    media: MediaFile[];
    meta?: Meta;
}

interface UploadResponseType {
    images?: {url: string; ref: string | null}[];
    files?: {url: string; ref: string | null}[];
    media?: {url: string; ref: string | null; thumbnail?: string | null}[];
}

const mediaDataType = 'MediaResponseType';

const imageExtensions = ['gif', 'jpg', 'jpeg', 'png', 'svg', 'svgz', 'webp'];
const videoExtensions = ['mp4', 'webm', 'ogv'];
const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a'];

const getExtension = (file: File) => file.name.split('.').pop()?.toLowerCase() || '';

const uploadTargetForFile = (file: File) => {
    const extension = getExtension(file);

    if (file.type.startsWith('image/') || imageExtensions.includes(extension)) {
        return {
            endpoint: '/images/upload/',
            resourceName: 'images' as const,
            extraFormData: {purpose: 'image'}
        };
    }

    if (
        file.type.startsWith('video/')
        || file.type.startsWith('audio/')
        || videoExtensions.includes(extension)
        || audioExtensions.includes(extension)
    ) {
        return {
            endpoint: '/media/upload/',
            resourceName: 'media' as const,
            extraFormData: {}
        };
    }

    return {
        endpoint: '/files/upload/',
        resourceName: 'files' as const,
        extraFormData: {}
    };
};

export const useBrowseMedia = createQuery<MediaResponseType>({
    dataType: mediaDataType,
    path: '/media/',
    defaultSearchParams: {
        limit: '30',
        order: 'created_at desc'
    }
});

export const useReadMedia = createQueryWithId<MediaResponseType>({
    dataType: mediaDataType,
    path: id => `/media/${id}/`
});

export const useUploadMediaFile = () => {
    const fetchApi = useFetchApi();
    const queryClient = useQueryClient();
    const {onInvalidate} = useFramework();

    return useMutation<UploadResponseType, unknown, {file: File}>({
        mutationFn: ({file}) => {
            const target = uploadTargetForFile(file);
            const formData = new FormData();
            formData.append('file', file, file.name);

            Object.entries(target.extraFormData).forEach(([key, value]) => {
                formData.append(key, value);
            });

            return fetchApi(apiUrl(target.endpoint), {
                method: 'POST',
                body: formData
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries([mediaDataType]);
            onInvalidate(mediaDataType);
        }
    });
};

export const getUploadedMediaUrl = (response: UploadResponseType) => (
    response.images?.[0]?.url || response.files?.[0]?.url || response.media?.[0]?.url
);
