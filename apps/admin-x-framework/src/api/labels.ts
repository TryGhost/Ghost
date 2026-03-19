import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createMutation} from '../utils/api/hooks';

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

export const useBrowseInfiniteLabels = createInfiniteQuery<LabelsResponseType & {isEnd: boolean}>({
    dataType,
    path: '/labels/',
    defaultNextPageParams: (lastPage, otherParams) => (lastPage.meta?.pagination.next
        ? {
            ...otherParams,
            page: lastPage.meta.pagination.next.toString()
        }
        : undefined),
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

export const useCreateLabel = createMutation<LabelsResponseType, Pick<Label, 'name'>>({
    method: 'POST',
    path: () => '/labels/',
    body: label => ({labels: [label]}),
    invalidateQueries: {dataType}
});

export const useEditLabel = createMutation<LabelsResponseType, Pick<Label, 'id' | 'name'>>({
    method: 'PUT',
    path: label => `/labels/${label.id}/`,
    body: label => ({labels: [label]}),
    invalidateQueries: {dataType}
});

export const useDeleteLabel = createMutation<void, string>({
    method: 'DELETE',
    path: id => `/labels/${id}/`,
    invalidateQueries: {dataType}
});
