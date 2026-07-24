import { useEffect, useMemo, useState } from "react";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useBrowseMembers } from "@tryghost/admin-x-framework/api/members";
import { useBrowseNewsletters } from "@tryghost/admin-x-framework/api/newsletters";

import { useStaffUsers } from "./use-staff-users";

/**
 * Host limit checks, ported from apps/admin-x-settings/src/hooks/
 * use-limiter.tsx onto the framework's config hook. Same lazily-imported
 * @tryghost/limit-service core, same currentCountQuery wiring. The package
 * ships no types, so the constructor surface is declared locally.
 */

export class LimitError extends Error {
    public readonly errorType: string;
    public readonly errorDetails: string;

    constructor({ errorType, errorDetails, message }: { errorType: string; errorDetails: string; message: string }) {
        super(message);
        this.errorType = errorType;
        this.errorDetails = errorDetails;
    }
}

export class IncorrectUsageError extends LimitError {
    constructor(options: { errorDetails: string; message: string }) {
        super(Object.assign({ errorType: "IncorrectUsageError" }, options));
    }
}

export class HostLimitError extends LimitError {
    constructor(options: { errorDetails: string; message: string }) {
        super(Object.assign({ errorType: "HostLimitError" }, options));
    }
}

interface LimiterLimits {
    staff?: { max?: number; error?: string; currentCountQuery?: () => Promise<number> };
    members?: { max?: number; error?: string; currentCountQuery?: () => Promise<number> };
    newsletters?: { max?: number; error?: string; currentCountQuery?: () => Promise<number> };
}

export interface Limiter {
    isLimited: (limitName: string) => boolean;
    isDisabled: (limitName: string) => boolean;
    checkWouldGoOverLimit: (limitName: string) => Promise<boolean>;
    errorIfWouldGoOverLimit: (limitName: string, metadata?: Record<string, unknown>) => Promise<void>;
    errorIfIsOverLimit: (limitName: string) => Promise<void>;
}

interface LimitServiceInstance extends Limiter {
    loadLimits(options: {
        limits: LimiterLimits;
        helpLink: string;
        errors: Record<string, new (options: { errorDetails: string; message: string }) => Error>;
    }): void;
}

type LimitServiceConstructor = new () => LimitServiceInstance;

const limitServiceImport = import("@tryghost/limit-service") as Promise<{ default: LimitServiceConstructor }>;

export function useLimiter(): Limiter {
    const { data: configData } = useBrowseConfig();
    const config = configData?.config;
    const [LimitService, setLimitService] = useState<LimitServiceConstructor | null>(null);

    useEffect(() => {
        void limitServiceImport.then((exports) => setLimitService(() => exports.default));
    }, []);

    const { users, contributorUsers, invites, isLoading } = useStaffUsers();
    const { refetch: fetchMembers } = useBrowseMembers({
        searchParams: { limit: "1" },
        enabled: false,
    });
    const { refetch: fetchNewsletters } = useBrowseNewsletters({
        searchParams: { filter: "status:active", limit: "1" },
        enabled: false,
    });

    const helpLink = useMemo(() => {
        if (config?.hostSettings?.billing?.enabled === true && config.hostSettings.billing.url) {
            return config.hostSettings.billing.url;
        }
        return "https://ghost.org/help/";
    }, [config?.hostSettings?.billing]);

    return useMemo<Limiter>(() => {
        const noOpLimiter: Limiter = {
            isLimited: () => false,
            isDisabled: () => false,
            checkWouldGoOverLimit: () => Promise.resolve(false),
            errorIfWouldGoOverLimit: () => Promise.resolve(),
            errorIfIsOverLimit: () => Promise.resolve(),
        };

        if (!LimitService || !config?.hostSettings?.limits || isLoading) {
            return noOpLimiter;
        }

        const limits = { ...config.hostSettings.limits } as LimiterLimits;
        const limiter = new LimitService();

        if (limits.staff) {
            limits.staff.currentCountQuery = () => {
                const staffUsers = users.filter((user) => user.status !== "inactive" && !contributorUsers.includes(user));
                const staffInvites = invites.filter((invite) => invite.role !== "Contributor");
                return Promise.resolve(staffUsers.length + staffInvites.length);
            };
        }

        if (limits.members) {
            limits.members.currentCountQuery = async () => {
                const { data: members } = await fetchMembers();
                return members?.meta?.pagination?.total || 0;
            };
        }

        if (limits.newsletters) {
            limits.newsletters.currentCountQuery = async () => {
                const { data: { pages } = { pages: [] } } = await fetchNewsletters();
                return pages[0]?.meta?.pagination.total || 0;
            };
        }

        limiter.loadLimits({
            limits,
            helpLink,
            errors: {
                HostLimitError,
                IncorrectUsageError,
            },
        });

        return {
            isLimited: (limitName) => limiter.isLimited(limitName),
            isDisabled: (limitName) => limiter.isDisabled(limitName),
            checkWouldGoOverLimit: (limitName) => limiter.checkWouldGoOverLimit(limitName),
            errorIfWouldGoOverLimit: (limitName, metadata = {}) => limiter.errorIfWouldGoOverLimit(limitName, metadata),
            errorIfIsOverLimit: (limitName) => limiter.errorIfIsOverLimit(limitName),
        };
    }, [LimitService, config, contributorUsers, fetchMembers, fetchNewsletters, helpLink, invites, isLoading, users]);
}
