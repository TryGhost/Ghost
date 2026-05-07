import AutomationEditor from '@src/views/Automations/editor';
import React from 'react';
import {MemoryRouter, Route, Routes} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

const mockUseReadAutomation = vi.fn();

vi.mock('@tryghost/admin-x-framework/api/automations', () => ({
    useReadAutomation: (...args: unknown[]) => mockUseReadAutomation(...args)
}));

vi.mock('@components/layout/main-layout', () => ({
    default: ({children}: {children: React.ReactNode}) => <div data-testid='main-layout'>{children}</div>
}));

// xyflow's ReactFlow needs a sized container; stub it out for unit tests.
type StubNode = {id: string; data?: Record<string, unknown>; type?: string};
type StubReactFlowProps = {
    nodes: StubNode[];
    nodeTypes?: Record<string, React.ComponentType<NodeRenderProps>>;
};
type NodeRenderProps = {id: string; data: Record<string, unknown>; type: string};

vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
    return {
        ...actual,
        ReactFlow: ({nodes, nodeTypes}: StubReactFlowProps) => (
            <div data-testid='react-flow-mock'>
                {nodes.map((node) => {
                    const nodeType = node.type ?? 'default';
                    const Custom = nodeTypes?.[nodeType];
                    return (
                        <div key={node.id} data-node-id={node.id} data-node-type={nodeType}>
                            {Custom ? <Custom data={node.data ?? {}} id={node.id} type={nodeType} /> : null}
                        </div>
                    );
                })}
            </div>
        ),
        Background: () => null,
        Handle: () => null
    };
});

const automationDetail = {
    id: 'automation-id-1',
    slug: 'member-welcome-email-free',
    name: 'Welcome Email (Free)',
    status: 'active' as const,
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    actions: [
        {
            id: 'action-delay',
            type: 'delay' as const,
            data: {delay_hours: 24}
        },
        {
            id: 'action-email',
            type: 'send email' as const,
            data: {
                email_subject: 'Welcome to The Blueprint',
                email_lexical: '{"root":{"children":[]}}',
                email_sender_name: null,
                email_sender_email: null,
                email_sender_reply_to: null,
                email_design_setting_id: 'design-1'
            }
        }
    ],
    edges: [
        {source_action_id: 'action-delay', target_action_id: 'action-email'}
    ]
};

const renderEditor = () => render(
    <MemoryRouter initialEntries={['/automations/automation-id-1']}>
        <Routes>
            <Route element={<AutomationEditor />} path='/automations/:id' />
        </Routes>
    </MemoryRouter>
);

describe('AutomationEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the loading state while the automation is fetching', () => {
        mockUseReadAutomation.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false
        });

        renderEditor();

        expect(screen.getByTestId('automation-canvas-loading')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Publish changes'})).toBeDisabled();
    });

    it('renders the error banner when the read query fails', () => {
        mockUseReadAutomation.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true
        });

        renderEditor();

        expect(screen.getByRole('alert')).toHaveTextContent('Couldn\'t load automation');
        expect(screen.queryByTestId('automation-canvas')).not.toBeInTheDocument();
    });

    it('renders the trigger, delay, send-email, and tail nodes following the action chain', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        expect(screen.getByText('Welcome Email (Free)')).toBeInTheDocument();
        expect(screen.getByText('Trigger')).toBeInTheDocument();
        expect(screen.getByText('Member signs up')).toBeInTheDocument();
        expect(screen.getByText('Wait')).toBeInTheDocument();
        expect(screen.getByText('1 day')).toBeInTheDocument();
        expect(screen.getByText('Send email')).toBeInTheDocument();
        expect(screen.getByText('Welcome to The Blueprint')).toBeInTheDocument();
        expect(screen.getByTestId('react-flow-mock').querySelector('[data-node-id="__tail__"]')).toBeInTheDocument();
    });

    it('links the back button to the automations list', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        expect(screen.getByRole('link', {name: 'Back to automations'})).toHaveAttribute('href', '/automations');
    });
});
