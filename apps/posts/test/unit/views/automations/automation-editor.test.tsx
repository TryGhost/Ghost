import AutomationEditor from '@src/views/Automations/editor';
import React from 'react';
import {MemoryRouter, Route, Routes} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

const mockUseReadAutomation = vi.fn();

vi.mock('@tryghost/admin-x-framework/api/automations', () => ({
    useReadAutomation: (...args: unknown[]) => mockUseReadAutomation(...args)
}));

// xyflow's ReactFlow needs a sized container; stub it out for unit tests.
type StubNode = {id: string; data?: Record<string, unknown>; type?: string};
type StubEdge = {id: string; source: string; target: string};
type StubReactFlowProps = {
    nodes: StubNode[];
    edges?: StubEdge[];
    nodeTypes?: Record<string, React.ComponentType<NodeRenderProps>>;
};
type NodeRenderProps = {id: string; data: Record<string, unknown>; type: string};

vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
    return {
        ...actual,
        ReactFlow: ({nodes, edges, nodeTypes}: StubReactFlowProps) => (
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
                <ul data-testid='react-flow-mock-edges'>
                    {(edges ?? []).map(edge => (
                        <li key={edge.id} data-edge-id={edge.id} data-source={edge.source} data-target={edge.target} />
                    ))}
                </ul>
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
            id: 'action-wait',
            type: 'wait' as const,
            data: {wait_hours: 24}
        },
        {
            id: 'action-email',
            type: 'send_email' as const,
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
        {source_action_id: 'action-wait', target_action_id: 'action-email'}
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

    it('renders the trigger, wait, send-email, and tail nodes following the action chain', () => {
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

        const edgeList = screen.getByTestId('react-flow-mock-edges');
        const edgePairs = Array.from(edgeList.querySelectorAll('li')).map(li => [
            li.getAttribute('data-source'),
            li.getAttribute('data-target')
        ]);
        expect(edgePairs).toEqual([
            ['trigger', 'action-wait'],
            ['action-wait', 'action-email'],
            ['action-email', '__tail__']
        ]);
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
