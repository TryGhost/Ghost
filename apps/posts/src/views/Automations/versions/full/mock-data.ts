export type AutomationStatus = 'active' | 'paused' | 'draft';

export interface Automation {
    id: string;
    name: string;
    description: string;
    status: AutomationStatus;
    updatedAt: string;
}

export const mockAutomations: Automation[] = [
    {
        id: 'welcome-series',
        name: 'Welcome series',
        description: 'Send a 3-email onboarding sequence when a member signs up.',
        status: 'active',
        updatedAt: '2026-04-18T10:24:00Z'
    },
    {
        id: 'paid-upgrade-nudge',
        name: 'Paid upgrade nudge',
        description: 'Remind free members to upgrade after 14 days of engagement.',
        status: 'active',
        updatedAt: '2026-04-11T08:00:00Z'
    },
    {
        id: 'inactive-winback',
        name: 'Inactive win-back',
        description: 'Re-engage members who have not opened an email in 60 days.',
        status: 'paused',
        updatedAt: '2026-03-29T15:42:00Z'
    },
    {
        id: 'cancellation-followup',
        name: 'Cancellation follow-up',
        description: 'Ask for feedback when a paid member cancels their subscription.',
        status: 'draft',
        updatedAt: '2026-04-20T09:15:00Z'
    }
];

export function getAutomationById(id: string): Automation | undefined {
    return mockAutomations.find(a => a.id === id);
}
