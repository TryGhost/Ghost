import useStaffUsers from './useStaffUsers';
import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useEffect, useMemo, useState} from 'react';
import {useGlobalData} from '../components/providers/GlobalDataProvider';

const limitServiceImport = import('@tryghost/limit-service');

export class LimitError extends Error {
    public readonly errorType: string;
    public readonly errorDetails: string;

    constructor({errorType, errorDetails, message}: {errorType: string, errorDetails: string, message: string}) {
        super(message);
        this.errorType = errorType;
        this.errorDetails = errorDetails;
    }
}

export class IncorrectUsageError extends LimitError {
    constructor(options: {errorDetails: string, message: string}) {
        super(Object.assign({errorType: 'IncorrectUsageError'}, options));
    }
}

export class HostLimitError extends LimitError {
    constructor(options: {errorDetails: string, message: string}) {
        super(Object.assign({errorType: 'HostLimitError'}, options));
    }
}

interface LimiterLimits {
    staff?: {
        max?: number
        error?: string
        currentCountQuery?: () => Promise<number>
    }
    members?: {
        max?: number
        error?: string
        currentCountQuery?: () => Promise<number>
    }
    newsletters?: {
        max?: number
        error?: string
        currentCountQuery?: () => Promise<number>
    },
    limitAnalytics?: {
        disabled?: boolean
        error?: string
        currentCountQuery?: () => Promise<boolean>
    }
}

export const useLimiter = () => {
    const {config, settings} = useGlobalData();
    const [LimitService, setLimitService] = useState<typeof import('@tryghost/limit-service') | null>(null);

    useEffect(() => {
        limitServiceImport.then(exports => setLimitService(() => exports.default));
    }, []);

    const {users, contributorUsers, invites, isLoading} = useStaffUsers();
    const {refetch: fetchMembers} = useBrowseMembers({
        searchParams: {limit: '1'},
        enabled: false
    });
    const {refetch: fetchNewsletters} = useBrowseNewsletters({
        searchParams: {filter: 'status:active', limit: '1'},
        enabled: false
    });

    const helpLink = useMemo(() => {
        if (config.hostSettings?.billing?.enabled === true && config.hostSettings?.billing?.url) {
            return config.hostSettings.billing.url;
        } else {
            return 'https://ghost.org/help/';
        }
    }, [config.hostSettings?.billing]);

    return useMemo(() => {
        if (!LimitService || !config.hostSettings?.limits || isLoading) {
            return;
        }

        const limits = {...config.hostSettings.limits} as LimiterLimits;
        const limiter = new LimitService();

        if (limits.staff) {
            limits.staff.currentCountQuery = async () => {
                // useStaffUsers will only return the first 100 users by default, but we can assume
                // that either there's no limit or the limit is <100
                const staffUsers = users.filter(u => u.status !== 'inactive' && !contributorUsers.includes(u));
                const staffInvites = invites.filter(i => i.role !== 'Contributor');

                return staffUsers.length + staffInvites.length;
            };
        }

        if (limits.members) {
            limits.members.currentCountQuery = async () => {
                const {data: members} = await fetchMembers();
                return members?.meta?.pagination?.total || 0;
            };
        }

        if (limits.newsletters) {
            limits.newsletters.currentCountQuery = async () => {
                const {data: {pages} = {pages: []}} = await fetchNewsletters();
                return pages[0].meta?.pagination.total || 0;
            };
        }

        if (limits.limitAnalytics) {
            limits.limitAnalytics.currentCountQuery = async () => {
                // TODO: It's not clear yet how and where traffic analytics will be stored,
                // for now we check the settings key and the labs settings for it.
                // See https://linear.app/ghost/issue/BAE-447/validate-how-to-get-information-about-analytics-and-social-web-usage
                const key = 'trafficAnalytics';
                const analyticsSetting = settings.find(s => s.key === key);
                const labSettings = settings.find(s => s.key === 'labs');
                const parsedLabsSetting = labSettings?.value ? JSON.parse(labSettings.value as string) : {};
                const labsSettingEnabled = parsedLabsSetting[key] || false;

                return (analyticsSetting && analyticsSetting.value === true) || labsSettingEnabled;
            };
        }

        limiter.loadLimits({
            limits,
            helpLink,
            errors: {
                HostLimitError,
                IncorrectUsageError
            }
        });

        return {
            isLimited: (limitName: string): boolean => limiter.isLimited(limitName),
            checkWouldGoOverLimit: (limitName: string): Promise<boolean> => limiter.checkWouldGoOverLimit(limitName),
            errorIfWouldGoOverLimit: (limitName: string, metadata: Record<string, unknown> = {}): Promise<void> => limiter.errorIfWouldGoOverLimit(limitName, metadata),
            errorIfIsOverLimit: (limitName: string): Promise<void> => limiter.errorIfIsOverLimit(limitName)
        };
    }, [LimitService, config.hostSettings?.limits, contributorUsers, fetchMembers, fetchNewsletters, helpLink, invites, isLoading, users, settings]);
};
