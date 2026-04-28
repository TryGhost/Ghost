import {useSearchParams} from '@tryghost/admin-x-framework';

export type AutomationVersion = 'v1' | 'full';

export const useAutomationVersion = (): AutomationVersion => {
    const [params] = useSearchParams();
    const raw = params.get('v');
    if (raw === '1' || raw === 'v1') {
        return 'v1';
    }
    return 'full';
};
