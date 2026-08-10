import type {Automation} from '@tryghost/admin-x-framework/api/automations';

export type AutomationRunAnalytics = {
    completed: number;
    enrollments: number;
    enrollmentsByDay: Array<{date: string; count: number}>;
    inProgress: number;
    lastRunAt: string | null;
};

const analyticsBySlug: Record<string, AutomationRunAnalytics> = {
    'member-welcome-email-free': {
        completed: 1225,
        enrollments: 1432,
        enrollmentsByDay: [18, 20, 21, 23, 22, 25, 27, 26, 29, 31, 30, 32, 33, 34, 33, 35, 36, 35, 34, 33, 31, 32, 30, 29, 30, 28, 27, 28, 26, 27].map((count, index) => ({
            date: new Date(Date.UTC(2026, 6, index - 8)).toISOString().slice(0, 10),
            count
        })),
        inProgress: 118,
        lastRunAt: '2026-07-21T07:12:00Z'
    },
    'member-welcome-email-paid': {
        completed: 320,
        enrollments: 412,
        enrollmentsByDay: [9, 10, 10, 11, 11, 12, 11, 12, 13, 12, 13, 13, 12, 13, 14, 13, 13, 12, 13, 13, 12, 13, 14, 13, 13, 12, 13, 14, 13, 13].map((count, index) => ({
            date: new Date(Date.UTC(2026, 6, index - 8)).toISOString().slice(0, 10),
            count
        })),
        inProgress: 61,
        lastRunAt: '2026-07-21T05:55:00Z'
    }
};

const emptyAnalytics: AutomationRunAnalytics = {
    completed: 0,
    enrollments: 0,
    enrollmentsByDay: [],
    inProgress: 0,
    lastRunAt: null
};

export const getAutomationRunAnalytics = (automation: Pick<Automation, 'slug'>): AutomationRunAnalytics => (
    analyticsBySlug[automation.slug] ?? emptyAnalytics
);

export const formatLastRun = (iso: string | null, now = Date.now()): string => {
    if (!iso) {
        return 'Never';
    }

    const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
    if (minutes < 1) {
        return 'Just now';
    }
    if (minutes < 60) {
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }

    const hours = Math.round(minutes / 60);
    if (hours < 24) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
};
