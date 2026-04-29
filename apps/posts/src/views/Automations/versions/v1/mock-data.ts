export type AutomationStatus = 'live' | 'off';

export interface Automation {
    id: string;
    name: string;
    description: string;
    status: AutomationStatus;
    updatedAt: string;
}

export const mockAutomations: Automation[] = [
    {
        id: 'welcome-free',
        name: 'Welcome Email — Free',
        description: 'Onboard new free members with a short welcome email.',
        status: 'live',
        updatedAt: '2026-04-21T10:00:00Z'
    },
    {
        id: 'welcome-paid',
        name: 'Welcome Email — Paid',
        description: 'Greet new paid members and point them at member-only content.',
        status: 'off',
        updatedAt: '2026-04-26T16:30:00Z'
    }
];

export function getAutomationById(id: string): Automation | undefined {
    return mockAutomations.find(a => a.id === id);
}

export function setAutomationStatus(id: string, status: AutomationStatus): void {
    const automation = mockAutomations.find(a => a.id === id);
    if (automation) {
        automation.status = status;
    }
}
