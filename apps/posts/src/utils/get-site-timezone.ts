import type {Setting} from '@tryghost/admin-x-framework/api/settings';

export const getSiteTimezone = (settings: ReadonlyArray<Setting>): string => {
    for (const setting of settings) {
        if (setting.key === 'timezone') {
            const result = setting.value;
            if (typeof result !== 'string') {
                throw new TypeError('Site timezone setting is not a string');
            }
            return result;
        }
    }
    return 'Etc/UTC';
};