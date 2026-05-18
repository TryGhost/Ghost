import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';
import {AlreadyExistsError, ValidationError} from '../utils/errors';

export type Label = {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
}

export interface LabelsResponseType {
    meta?: Meta
    labels: Label[]
}

const dataType = 'LabelsResponseType';
const DUPLICATE_LABEL_API_CODE = 'LABEL_ALREADY_EXISTS';
const DUPLICATE_LABEL_INLINE_MESSAGE = 'A label with this name already exists';

const mapDuplicateLabelError = (error: unknown) => {
    if (error instanceof ValidationError && error.data?.errors[0]?.code === DUPLICATE_LABEL_API_CODE) {
        return new AlreadyExistsError(DUPLICATE_LABEL_INLINE_MESSAGE);
    }

    return error;
};

export const useBrowseLabels = createQuery<LabelsResponseType>({
    dataType,
    path: '/labels/'
});

export const useBrowseLabelsInfinite = createInfiniteQuery<LabelsResponseType & {isEnd: boolean}>({
    dataType,
    path: '/labels/',
    defaultNextPageParams: (lastPage, otherParams) => {
        if (!lastPage.meta?.pagination.next) {
            return undefined;
        }

        return {
            ...otherParams,
            page: lastPage.meta.pagination.next.toString()
        };
    },
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<LabelsResponseType>;
        const labels = pages.flatMap(page => page.labels);
        const meta = pages[pages.length - 1].meta;

        return {
            labels,
            meta,
            isEnd: meta ? meta.pagination.pages === meta.pagination.page : true
        };
    }
});

export const getLabelBySlug = createQueryWithId<LabelsResponseType>({
    dataType,
    path: slug => `/labels/slug/${slug}/`
});

export const useCreateLabel = createMutation<LabelsResponseType, Pick<Label, 'name'>>({
    method: 'POST',
    path: () => '/labels/',
    body: label => ({labels: [label]}),
    mapError: mapDuplicateLabelError,
    invalidateQueries: {
        dataType
    }
});

export const useEditLabel = createMutation<LabelsResponseType, Pick<Label, 'id' | 'name'>>({
    method: 'PUT',
    path: label => `/labels/${label.id}/`,
    body: label => ({labels: [label]}),
    mapError: mapDuplicateLabelError,
    invalidateQueries: {
        dataType
    }
});

export const useDeleteLabel = createMutation<void, string>({
    method: 'DELETE',
    path: id => `/labels/${id}/`,
    invalidateQueries: {
        dataType
    }
});
