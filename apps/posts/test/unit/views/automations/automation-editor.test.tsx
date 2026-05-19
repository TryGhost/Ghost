import AutomationEditor from '@src/views/Automations/editor';
import React from 'react';
import {AutomationDetail, MAX_AUTOMATION_ACTIONS} from '@tryghost/admin-x-framework/api/automations';
import {MemoryRouter, Route, Routes} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';

const mockUseReadAutomation = vi.fn();
const mockEditMutation = {
    mutate: vi.fn(),
    isLoading: false,
    variables: undefined as {id: string; status: 'active' | 'inactive'} | undefined
};

vi.mock('@tryghost/admin-x-framework/api/automations', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/automations')>(
        '@tryghost/admin-x-framework/api/automations'
    );
    return {
        ...actual,
        useReadAutomation: (...args: unknown[]) => mockUseReadAutomation(...args),
        useEditAutomation: () => mockEditMutation
    };
});

// xyflow's ReactFlow needs a sized container; stub it out for unit tests.
type StubNode = {id: string; data?: Record<string, unknown>; type?: string};
type StubEdge = {id: string; source: string; target: string; type?: string; data?: Record<string, unknown>};
type StubReactFlowProps = {
    nodes: StubNode[];
    edges?: StubEdge[];
    nodeTypes?: Record<string, React.ComponentType<NodeRenderProps>>;
    edgeTypes?: Record<string, React.ComponentType<EdgeRenderProps>>;
};
type NodeRenderProps = {id: string; data: Record<string, unknown>; type: string};
type EdgeRenderProps = {id: string; data: Record<string, unknown>; sourceX: number; sourceY: number; targetX: number; targetY: number; sourcePosition: string; targetPosition: string};

vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
    return {
        ...actual,
        ReactFlow: ({nodes, edges, nodeTypes, edgeTypes}: StubReactFlowProps) => (
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
                    {(edges ?? []).map((edge) => {
                        const Custom = edge.type ? edgeTypes?.[edge.type] : undefined;
                        return (
                            <li key={edge.id} data-edge-id={edge.id} data-edge-type={edge.type ?? 'smoothstep'} data-source={edge.source} data-target={edge.target}>
                                {Custom ? (
                                    <Custom
                                        data={edge.data ?? {}}
                                        id={edge.id}
                                        sourcePosition='bottom'
                                        sourceX={0}
                                        sourceY={0}
                                        targetPosition='top'
                                        targetX={0}
                                        targetY={0}
                                    />
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            </div>
        ),
        Background: () => null,
        Handle: () => null,
        BaseEdge: () => null,
        EdgeLabelRenderer: ({children}: {children: React.ReactNode}) => <>{children}</>,
        getSmoothStepPath: () => ['M 0 0', 0, 0]
    };
});

const automationDetail: AutomationDetail = {
    id: 'automation-id-1',
    slug: 'member-welcome-email-free',
    name: 'Welcome Email (Free)',
    status: 'active',
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    actions: [
        {id: 'action-wait', type: 'wait', data: {wait_hours: 24}},
        {
            id: 'action-email',
            type: 'send_email',
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
    edges: [{source_action_id: 'action-wait', target_action_id: 'action-email'}]
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
        mockUseReadAutomation.mockReset();
        mockEditMutation.mutate.mockReset();
        mockEditMutation.isLoading = false;
        mockEditMutation.variables = undefined;
    });

    it('renders the loading state while the automation is fetching', () => {
        mockUseReadAutomation.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false
        });

        renderEditor();

        expect(screen.getByTestId('automation-canvas-loading')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Publish'})).toBeDisabled();
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
            ['__trigger__', 'action-wait'],
            ['action-wait', 'action-email'],
            ['action-email', '__tail__']
        ]);
    });

    it('disables the publish button when the read query fails', () => {
        mockUseReadAutomation.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true
        });

        renderEditor();

        expect(screen.getByRole('button', {name: 'Publish'})).toBeDisabled();
    });

    it('disables the publish button when the automation has no actions', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive', actions: [], edges: []}]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        expect(screen.getByRole('button', {name: 'Publish'})).toBeDisabled();
    });

    it('publishes an inactive automation when clicking Publish', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const button = screen.getByRole('button', {name: 'Publish'});
        expect(button).not.toBeDisabled();
        fireEvent.click(button);

        expect(mockEditMutation.mutate).toHaveBeenCalledWith(
            {
                id: 'automation-id-1',
                status: 'active',
                actions: automationDetail.actions,
                edges: automationDetail.edges
            },
            expect.any(Object)
        );
    });

    it('shows the dropdown for active automations', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        expect(screen.getByRole('button', {name: 'Automation options'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Published'})).toBeDisabled();
    });

    it('hides the dropdown for inactive automations', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        expect(screen.queryByRole('button', {name: 'Automation options'})).not.toBeInTheDocument();
    });

    it('disables the publish button and shows loading UI while a publish request is in flight', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Publish'}));

        const button = screen.getByRole('button', {name: 'Publishing...'});
        expect(button).toBeDisabled();
        expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('disables the confirmation modal controls while an unpublish request is in flight', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const trigger = screen.getByRole('button', {name: 'Automation options'});
        fireEvent.pointerDown(trigger, {button: 0, ctrlKey: false});
        fireEvent.click(trigger);
        fireEvent.click(await screen.findByRole('menuitem', {name: /Turn off/}));
        fireEvent.click(screen.getByRole('button', {name: 'Turn off'}));

        expect(screen.getByRole('button', {name: 'Cancel'})).toBeDisabled();
        const turnOff = screen.getByRole('button', {name: 'Turning off...'});
        expect(turnOff).toBeDisabled();
        expect(turnOff.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows a retry state when publishing fails', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });
        mockEditMutation.mutate.mockImplementation((_payload, options) => {
            options.onError();
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Publish'}));

        const button = await screen.findByRole('button', {name: 'Retry'});
        expect(button).not.toBeDisabled();
        expect(button).toHaveClass('bg-destructive');
        expect(screen.queryByText(/Couldn.t publish automation/)).not.toBeInTheDocument();
    });

    it('turns off an active automation when confirming from the dropdown', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const trigger = screen.getByRole('button', {name: 'Automation options'});
        fireEvent.pointerDown(trigger, {button: 0, ctrlKey: false});
        fireEvent.click(trigger);

        fireEvent.click(await screen.findByRole('menuitem', {name: /Turn off/}));

        expect(screen.getByText('Turn off this automation?')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Turn off'}));

        expect(mockEditMutation.mutate).toHaveBeenCalledWith(
            {
                id: 'automation-id-1',
                status: 'inactive',
                actions: automationDetail.actions,
                edges: automationDetail.edges
            },
            expect.any(Object)
        );
    });

    it('disables the Turn off confirmation button and shows loading UI while unpublishing', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const trigger = screen.getByRole('button', {name: 'Automation options'});
        fireEvent.pointerDown(trigger, {button: 0, ctrlKey: false});
        fireEvent.click(trigger);
        fireEvent.click(await screen.findByRole('menuitem', {name: /Turn off/}));
        fireEvent.click(screen.getByRole('button', {name: 'Turn off'}));

        const button = screen.getByRole('button', {name: 'Turning off...'});
        expect(button).toBeDisabled();
        expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows a retry state in the confirmation modal when unpublishing fails', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });
        mockEditMutation.mutate.mockImplementation((_payload, options) => {
            options.onError();
        });

        renderEditor();

        const trigger = screen.getByRole('button', {name: 'Automation options'});
        fireEvent.pointerDown(trigger, {button: 0, ctrlKey: false});
        fireEvent.click(trigger);
        fireEvent.click(await screen.findByRole('menuitem', {name: /Turn off/}));
        fireEvent.click(screen.getByRole('button', {name: 'Turn off'}));

        const button = await screen.findByRole('button', {name: 'Retry'});
        expect(button).not.toBeDisabled();
        expect(button).toHaveClass('bg-destructive');
        expect(screen.getByText('Turn off this automation?')).toBeInTheDocument();
        expect(screen.queryByText(/Couldn.t turn off automation/)).not.toBeInTheDocument();
    });

    it('closes the confirmation modal after unpublishing succeeds', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });
        mockEditMutation.mutate.mockImplementation((payload, options) => {
            options.onSuccess({automations: [{...automationDetail, status: payload.status}]});
        });

        renderEditor();

        const trigger = screen.getByRole('button', {name: 'Automation options'});
        fireEvent.pointerDown(trigger, {button: 0, ctrlKey: false});
        fireEvent.click(trigger);
        fireEvent.click(await screen.findByRole('menuitem', {name: /Turn off/}));
        fireEvent.click(screen.getByRole('button', {name: 'Turn off'}));

        await waitFor(() => {
            expect(screen.queryByText('Turn off this automation?')).not.toBeInTheDocument();
        });
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

    it('inserts a wait step at the tail when the tail + is clicked and a type is picked', async () => {
        // Use a 48-hour wait in the fixture so the appended 24h step's "1 day" label is distinguishable.
        const fixture: AutomationDetail = {
            ...automationDetail,
            actions: [
                {id: 'action-wait', type: 'wait', data: {wait_hours: 48}},
                automationDetail.actions[1]
            ]
        };
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [fixture]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByTestId('add-step-tail-button'));
        const picker = await screen.findByTestId('step-picker');
        fireEvent.click(within(picker).getByText('Wait'));

        // The new step renders with the default 24h wait ("1 day") at the end of the chain.
        expect(screen.getByText('1 day')).toBeInTheDocument();
        // Adding a step flips the editor into a dirty state.
        expect(screen.getByRole('button', {name: 'Publish changes'})).toBeEnabled();
    });

    it('inserts a send_email step with placeholder defaults when picked from the tail', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByTestId('add-step-tail-button'));
        const picker = await screen.findByTestId('step-picker');
        fireEvent.click(within(picker).getByText('Email'));

        // The new send_email step renders with the placeholder subject.
        expect(screen.getByText('Untitled email')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Publish changes'})).toBeEnabled();
    });

    it('inserts a step between two existing actions via the in-edge + button', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByTestId('add-step-button-action-wait-action-email'));
        const picker = await screen.findByTestId('step-picker');
        fireEvent.click(within(picker).getByText('Wait'));

        // The canvas now shows three step nodes (the trigger + tail are extra), with two "Wait" labels.
        expect(screen.getAllByText('Wait')).toHaveLength(2);
        // The original wait→send_email edge has been split: the new edge order goes
        // action-wait → <new> → action-email.
        const edgeList = screen.getByTestId('react-flow-mock-edges');
        const edgePairs = Array.from(edgeList.querySelectorAll('li')).map(li => [
            li.getAttribute('data-source'),
            li.getAttribute('data-target')
        ]);
        expect(edgePairs.some(([source, target]) => source === 'action-wait' && target === 'action-email')).toBe(false);
        const insertedId = edgePairs.find(([source]) => source === 'action-wait')?.[1];
        expect(insertedId).toBeTruthy();
        expect(edgePairs).toContainEqual([insertedId, 'action-email']);
    });

    it('enables Publish changes when the user adds a step locally', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        expect(screen.getByRole('button', {name: 'Published'})).toBeDisabled();

        fireEvent.click(screen.getByTestId('add-step-tail-button'));
        const picker = await screen.findByTestId('step-picker');
        fireEvent.click(within(picker).getByText('Wait'));

        expect(screen.getByRole('button', {name: 'Publish changes'})).toBeEnabled();
    });

    it('publishes structural changes and clears dirty state when Publish succeeds', async () => {
        const inactive: AutomationDetail = {...automationDetail, status: 'inactive'};
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [inactive]},
            isLoading: false,
            isError: false
        });

        // After mutate, echo the submitted payload back so the editor's draft snaps to the
        // post-publish state. Also bump the read mock so the next render sees the server in sync
        // (with a fresh updated_at, which the dirty check is intentionally insensitive to).
        mockEditMutation.mutate.mockImplementation((payload, options) => {
            const published: AutomationDetail = {
                ...inactive,
                status: payload.status,
                actions: payload.actions,
                edges: payload.edges,
                updated_at: '2026-05-06T00:00:00.000Z'
            };
            mockUseReadAutomation.mockReturnValue({
                data: {automations: [published]},
                isLoading: false,
                isError: false
            });
            options.onSuccess({automations: [published]});
        });

        renderEditor();

        // Stage a structural change locally via the canvas — this is the only way drafts diverge now.
        fireEvent.click(screen.getByTestId('add-step-tail-button'));
        const picker = await screen.findByTestId('step-picker');
        fireEvent.click(within(picker).getByText('Wait'));

        // The fixture is inactive, so the button reads "Publish" regardless of dirty state.
        const publishButton = screen.getByRole('button', {name: 'Publish'});
        expect(publishButton).toBeEnabled();
        fireEvent.click(publishButton);

        const mutateCall = mockEditMutation.mutate.mock.calls.at(-1)![0];
        expect(mutateCall.id).toBe('automation-id-1');
        expect(mutateCall.status).toBe('active');
        // Three actions now: the original wait + send_email + the locally-added wait.
        expect(mutateCall.actions).toHaveLength(3);

        // After publish the draft matches the response, so the button settles on Published + disabled.
        expect(screen.getByRole('button', {name: 'Published'})).toBeDisabled();
    });

    it('disables both + affordances when the action limit is reached', () => {
        const filled: AutomationDetail = {
            ...automationDetail,
            actions: Array.from({length: MAX_AUTOMATION_ACTIONS}, (_, index) => ({
                id: `wait-${index}`,
                type: 'wait' as const,
                data: {wait_hours: 24}
            })),
            edges: Array.from({length: MAX_AUTOMATION_ACTIONS - 1}, (_, index) => ({
                source_action_id: `wait-${index}`,
                target_action_id: `wait-${index + 1}`
            }))
        };

        mockUseReadAutomation.mockReturnValue({
            data: {automations: [filled]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        // The tail is a div with role=button; check aria-disabled instead of the disabled attribute.
        expect(screen.getByTestId('add-step-tail-button')).toHaveAttribute('aria-disabled', 'true');
        // The edge + uses a real <button> element.
        expect(screen.getByTestId('add-step-button-wait-0-wait-1')).toBeDisabled();
    });

    it('keeps both + affordances enabled at one below the action limit', () => {
        const justUnder: AutomationDetail = {
            ...automationDetail,
            actions: Array.from({length: MAX_AUTOMATION_ACTIONS - 1}, (_, index) => ({
                id: `wait-${index}`,
                type: 'wait' as const,
                data: {wait_hours: 24}
            })),
            edges: Array.from({length: MAX_AUTOMATION_ACTIONS - 2}, (_, index) => ({
                source_action_id: `wait-${index}`,
                target_action_id: `wait-${index + 1}`
            }))
        };

        mockUseReadAutomation.mockReturnValue({
            data: {automations: [justUnder]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        expect(screen.getByTestId('add-step-tail-button')).not.toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByTestId('add-step-button-wait-0-wait-1')).not.toBeDisabled();
    });

    it('does not flip the dirty flag when the server refetches with only a new updated_at', () => {
        const initial = {...automationDetail, updated_at: '2026-05-05T00:00:00.000Z'};
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [initial]},
            isLoading: false,
            isError: false
        });

        const {rerender} = renderEditor();

        // Baseline: clean active automation → Published, disabled.
        expect(screen.getByRole('button', {name: 'Published'})).toBeDisabled();

        // Simulate a focus-refetch that updates only `updated_at` (server-stamped, not user-editable).
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...initial, updated_at: '2026-05-06T12:34:56.000Z'}]},
            isLoading: false,
            isError: false
        });
        rerender(
            <MemoryRouter initialEntries={['/automations/automation-id-1']}>
                <Routes>
                    <Route element={<AutomationEditor />} path='/automations/:id' />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByRole('button', {name: 'Published'})).toBeDisabled();
    });

    it('adds three steps locally and publishes them all in the mutate payload', async () => {
        // Start from a clean active automation; we'll stage three local inserts before publishing.
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });
        mockEditMutation.mutate.mockImplementation((payload, options) => {
            options.onSuccess({automations: [{
                ...automationDetail,
                actions: payload.actions,
                edges: payload.edges
            }]});
        });

        renderEditor();

        // Insert at the tail three times in a row.
        const pickWaitAtTail = async () => {
            fireEvent.click(screen.getByTestId('add-step-tail-button'));
            const picker = await screen.findByTestId('step-picker');
            fireEvent.click(within(picker).getByText('Wait'));
        };
        await pickWaitAtTail();
        await pickWaitAtTail();
        await pickWaitAtTail();

        fireEvent.click(screen.getByRole('button', {name: 'Publish changes'}));

        const mutateCall = mockEditMutation.mutate.mock.calls.at(-1)![0];
        // Original 2 actions + 3 locally inserted = 5.
        expect(mutateCall.actions).toHaveLength(5);
        // The edge graph should form one continuous chain (n-1 edges connecting all actions).
        expect(mutateCall.edges).toHaveLength(4);
        const sources = new Set(mutateCall.edges.map((e: {source_action_id: string}) => e.source_action_id));
        const targets = new Set(mutateCall.edges.map((e: {target_action_id: string}) => e.target_action_id));
        // Every source/target references a real action in the payload.
        const actionIds = new Set(mutateCall.actions.map((a: {id: string}) => a.id));
        sources.forEach(id => expect(actionIds.has(id as string)).toBe(true));
        targets.forEach(id => expect(actionIds.has(id as string)).toBe(true));
    });

    // Publish-button label matrix. Captures the contract that the label switches across the four
    // combinations of (status, dirty). One assertion per cell so a regression in any cell flags
    // a specific test, not a parameterized table.
    const stageLocalEdit = async () => {
        fireEvent.click(screen.getByTestId('add-step-tail-button'));
        const picker = await screen.findByTestId('step-picker');
        fireEvent.click(within(picker).getByText('Wait'));
    };

    it('publish-button label: inactive + clean reads "Publish" and is enabled', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });
        renderEditor();
        expect(screen.getByRole('button', {name: 'Publish'})).toBeEnabled();
    });

    it('publish-button label: inactive + dirty still reads "Publish" (not "Publish changes")', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });
        renderEditor();
        await stageLocalEdit();
        expect(screen.getByRole('button', {name: 'Publish'})).toBeEnabled();
    });

    it('publish-button label: active + clean reads "Published" and is disabled', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });
        renderEditor();
        expect(screen.getByRole('button', {name: 'Published'})).toBeDisabled();
    });

    it('publish-button label: active + dirty reads "Publish changes" and is enabled', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });
        renderEditor();
        await stageLocalEdit();
        expect(screen.getByRole('button', {name: 'Publish changes'})).toBeEnabled();
    });

    it('clears the Retry state when the user stages another local edit after a failed publish', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });
        mockEditMutation.mutate.mockImplementation((_payload, options) => {
            options.onError();
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Publish'}));
        // After the failure, the button is the destructive Retry.
        expect(await screen.findByRole('button', {name: 'Retry'})).toHaveClass('bg-destructive');

        // Staging another local edit clears the failure state; the button returns to plain Publish.
        fireEvent.click(screen.getByTestId('add-step-tail-button'));
        const picker = await screen.findByTestId('step-picker');
        fireEvent.click(within(picker).getByText('Wait'));

        const recoveredButton = screen.getByRole('button', {name: 'Publish'});
        expect(recoveredButton).toBeEnabled();
        expect(recoveredButton).not.toHaveClass('bg-destructive');
    });
});
