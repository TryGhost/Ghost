import {Meta, createMutation, createQuery} from '../utils/api/hooks';

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

export const useBrowseLabels = createQuery<LabelsResponseType>({
    dataType,
    path: '/labels/'
});

export const useCreateLabel = createMutation<LabelsResponseType, Pick<Label, 'name'>>({
    method: 'POST',
    path: () => '/labels/',
    body: label => ({labels: [label]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: (newData, currentData) => {
            const current = currentData as LabelsResponseType;
            return current && {...current, labels: current.labels.concat(newData.labels)};
        }
    }
});

export const useEditLabel = createMutation<LabelsResponseType, Pick<Label, 'id' | 'name'>>({
    method: 'PUT',
    path: label => `/labels/${label.id}/`,
    body: label => ({labels: [label]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: (newData, currentData) => {
            const current = currentData as LabelsResponseType;
            return current && {
                ...current,
                labels: current.labels.map(label => newData.labels.find(({id}) => id === label.id) || label)
            };
        }
    }
});

export const useDeleteLabel = createMutation<void, string>({
    method: 'DELETE',
    path: id => `/labels/${id}/`,
    updateQueries: {
        dataType,
        emberUpdateType: 'delete',
        update: (_, currentData, id) => {
            const current = currentData as LabelsResponseType;
            return current && {...current, labels: current.labels.filter(label => label.id !== id)};
        }
    }
});
