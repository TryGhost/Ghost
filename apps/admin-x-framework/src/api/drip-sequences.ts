import {createMutation, createQueryWithId} from '../utils/api/hooks';

export type DripSequenceEmail = {
    id: string;
    subject: string;
    lexical: string;
    delay_days: number;
    next_welcome_email_automated_email_id: string | null;
    created_at: string;
    updated_at: string | null;
}

export type DripSequence = {
    automation_id: string | null;
    automation_slug: string;
    emails: DripSequenceEmail[];
}

export interface DripSequencesResponseType {
    drip_sequences: DripSequence[];
}

type EditDripSequencePayload = {
    automationSlug: string;
    emails: Array<{
        id?: string;
        subject: string;
        lexical: string;
        delay_days: number;
    }>;
};

const dataType = 'DripSequencesResponseType';

export const useBrowseDripSequence = createQueryWithId<DripSequencesResponseType>({
    dataType,
    path: automationSlug => `/drip_sequences/${automationSlug}/`
});

export const useEditDripSequence = createMutation<DripSequencesResponseType, EditDripSequencePayload>({
    method: 'PUT',
    path: ({automationSlug}) => `/drip_sequences/${automationSlug}/`,
    body: ({emails}) => ({drip_sequences: [{emails}]}),
    invalidateQueries: {
        filters: {
            queryKey: [dataType]
        }
    }
});
