import {createMutation} from '../utils/api/hooks';

export interface SendTestMailPayload {
    to?: string;
}

export interface SendTestMailResponseType {
    mail: Array<{
        sent: boolean;
        to: string;
    }>;
}

export const useSendTestMail = createMutation<SendTestMailResponseType, SendTestMailPayload>({
    method: 'POST',
    path: () => '/mail/test/',
    body: payload => payload
});
