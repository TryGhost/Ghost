import {Meta, createQuery} from '../utils/api/hooks';

export type Automation = {
    id: string;
    name: string;
    slug: string;
    status: 'active' | 'inactive';
}

export interface AutomationsResponseType {
    meta?: Meta;
    automations: Automation[];
}

const dataType = 'AutomationsResponseType';

export const useBrowseAutomations = createQuery<AutomationsResponseType>({
    dataType,
    path: '/automations/'
});
