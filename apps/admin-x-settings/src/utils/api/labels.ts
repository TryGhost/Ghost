import {Label} from '../../types/api';
import {Meta, createQuery} from '../apiRequests';

export interface LabelsResponseType {
    meta?: Meta
    labels: Label[]
}

const dataType = 'LabelsResponseType';

export const useBrowseLabels = createQuery<LabelsResponseType>({
    dataType,
    path: '/labels/',
    defaultSearchParams: {limit: 'all'}
});
