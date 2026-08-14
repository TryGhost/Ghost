import AutomationEditor from './editor';
import React from 'react';
import {MAX_AUTOMATION_ACTIONS} from '@tryghost/admin-x-framework/api/automations';
import type {AutomationDetail, AutomationDetailResponseType, EditAutomationPayload} from '@tryghost/admin-x-framework/api/automations';
import {RouterProvider, createMemoryRouter} from 'react-router';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';

const {mockToastError} = vi.hoisted(() => ({
    mockToastError: vi.fn()
}));

const NON_EMPTY_EMAIL_LEXICAL = '{"root":{"children":[{"type":"paragraph","children":[{"type":"text","text":"Welcome email body"}]}]}}';

vi.mock('sonner', () => ({
    toast: {
        error: mockToastError
    }
}));

// Stub the email content editor modal — its real internals (Koenig + email API
// hooks) are out of scope here. The stub exposes the seed props and a save button
// so we can assert the canvas wiring (open → seed → onSave → draft → publish).
vi.mock('@/automations/components/email-modal/email-content-modal', () => {
    const EmailContentModalStub = ({initialMode, initialSubject, initialLexical, isDiscardNavigationBlocked, onClose, onDirtyChange, onDiscardBlockedNavigation, onKeepEditingAfterBlockedNavigation, onSave}: {
        initialMode?: 'edit' | 'preview';
        initialSubject: string;
        initialLexical: string;
        isDiscardNavigationBlocked?: boolean;
        onClose: () => void;
        onDirtyChange?: (isDirty: boolean) => void;
        onDiscardBlockedNavigation?: () => void;
        onKeepEditingAfterBlockedNavigation?: () => void;
        onSave: (data: {subject: string; lexical: string}) => void;
    }) => {
        const [isDirty, setIsDirty] = React.useState(false);
        const [confirmDiscardOpen, setConfirmDiscardOpen] = React.useState(false);
        const allowDirtyCloseRef = React.useRef(false);

        React.useEffect(() => {
            onDirtyChange?.(isDirty && !allowDirtyCloseRef.current);
            return () => onDirtyChange?.(false);
        }, [isDirty, onDirtyChange]);

        const attemptClose = () => {
            if (isDirty) {
                setConfirmDiscardOpen(true);
                return;
            }

            onClose();
        };

        return (
            <div data-testid='email-content-modal'>
                <span data-testid='modal-initial-mode'>{initialMode ?? 'edit'}</span>
                <span data-testid='modal-initial-subject'>{initialSubject}</span>
                <span data-testid='modal-initial-lexical'>{initialLexical}</span>
                <button data-testid='modal-dirty' type='button' onClick={() => setIsDirty(true)}>dirty</button>
                <button data-testid='modal-save' type='button' onClick={() => {
                    onSave({subject: 'Edited via modal', lexical: NON_EMPTY_EMAIL_LEXICAL});
                    setIsDirty(false);
                }}>save</button>
                <button data-testid='modal-close' type='button' onClick={attemptClose}>close</button>
                {(confirmDiscardOpen || isDiscardNavigationBlocked) && (
                    <div aria-label='Discard changes?' role='alertdialog'>
                        <p>Your changes to this email haven&apos;t been saved.</p>
                        <button type='button' onClick={() => {
                            setConfirmDiscardOpen(false);
                            onKeepEditingAfterBlockedNavigation?.();
                        }}>Keep editing</button>
                        <button type='button' onClick={() => {
                            setConfirmDiscardOpen(false);
                            if (isDiscardNavigationBlocked) {
                                onDiscardBlockedNavigation?.();
                                return;
                            }

                            allowDirtyCloseRef.current = true;
                            onDirtyChange?.(false);
                            onClose();
                        }}>Discard</button>
                    </div>
                )}
            </div>
        );
    };

    return {
        default: EmailContentModalStub
    };
});

type MockEditMutationOptions = {
    onSuccess?: (data: AutomationDetailResponseType) => void;
    onError?: (error?: unknown) => void;
};
const mockUseReadAutomation = vi.fn<(...args: unknown[]) => {data?: AutomationDetailResponseType; isLoading?: boolean; isError?: boolean}>();
const mockEditMutation = {
    mutate: vi.fn<(payload: EditAutomationPayload, options: MockEditMutationOptions) => void>(),
    isLoading: false,
    variables: undefined as {id: string; status: 'active' | 'inactive'} | undefined
};
const mockReactFlow = {
    fitView: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    zoomTo: vi.fn()
};
let mockViewportZoom = 1;

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

const mockLabs = vi.hoisted((): {current: Record<string, boolean>} => ({current: {}}));

vi.mock('@tryghost/admin-x-framework/api/config', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/config')>(
        '@tryghost/admin-x-framework/api/config'
    );
    return {
        ...actual,
        useBrowseConfig: () => ({data: {config: {labs: mockLabs.current}}})
    };
});

// xyflow's ReactFlow needs a sized container; stub it out for unit tests.
type StubNode = {id: string; data?: Record<string, unknown>; type?: string};
type StubEdge = {id: string; source: string; target: string; type?: string; data?: Record<string, unknown>};
type StubReactFlowProps = {
    nodes: StubNode[];
    edges?: StubEdge[];
    children?: React.ReactNode;
    className?: string;
    nodeTypes?: Record<string, React.ComponentType<NodeRenderProps>>;
    edgeTypes?: Record<string, React.ComponentType<EdgeRenderProps>>;
    onNodeClick?: (event: React.MouseEvent<HTMLDivElement>, node: StubNode) => void;
    onNodeDoubleClick?: (event: React.MouseEvent<HTMLDivElement>, node: StubNode) => void;
    onPaneClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    zoomOnDoubleClick?: boolean;
};
type NodeRenderProps = {id: string; data: Record<string, unknown>; type: string};
type EdgeRenderProps = {id: string; data: Record<string, unknown>; sourceX: number; sourceY: number; targetX: number; targetY: number; sourcePosition: string; targetPosition: string};

vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
    return {
        ...actual,
        ReactFlow: ({nodes, edges, children, className, nodeTypes, edgeTypes, onNodeClick, onNodeDoubleClick, onPaneClick, zoomOnDoubleClick}: StubReactFlowProps) => (
            <div className={className} data-testid='react-flow-mock' data-zoom-on-double-click={String(zoomOnDoubleClick)} onClick={onPaneClick}>
                {nodes.map((node) => {
                    const nodeType = node.type ?? 'default';
                    const Custom = nodeTypes?.[nodeType];
                    return (
                        <div
                            key={node.id}
                            data-node-id={node.id}
                            data-node-type={nodeType}
                            onClick={(event) => {
                                event.stopPropagation();
                                onNodeClick?.(event, node);
                            }}
                            onDoubleClick={(event) => {
                                event.stopPropagation();
                                onNodeDoubleClick?.(event, node);
                            }}
                        >
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
                {children}
            </div>
        ),
        Background: () => null,
        Controls: ({children, className, showFitView, showInteractive, showZoom, style}: {children?: React.ReactNode; className?: string; showFitView?: boolean; showInteractive?: boolean; showZoom?: boolean; style?: React.CSSProperties}) => (
            <div
                className={className}
                data-show-fit-view={String(showFitView)}
                data-show-interactive={String(showInteractive)}
                data-show-zoom={String(showZoom)}
                data-testid='react-flow-controls'
                style={style}
            >
                {children}
            </div>
        ),
        Handle: () => null,
        BaseEdge: () => null,
        EdgeLabelRenderer: ({children}: {children: React.ReactNode}) => <>{children}</>,
        getSmoothStepPath: () => ['M 0 0', 0, 0],
        useReactFlow: () => mockReactFlow,
        useViewport: () => ({x: 0, y: 0, zoom: mockViewportZoom})
    };
});

const automationDetail: AutomationDetail = {
    id: 'automation-id-1',
    slug: 'member-welcome-email-free',
    name: 'Free member welcome flow',
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
                email_lexical: NON_EMPTY_EMAIL_LEXICAL,
                email_design_setting_id: 'design-1'
            }
        }
    ],
    edges: [{source_action_id: 'action-wait', target_action_id: 'action-email'}]
};

const renderEditor = (initialEntries = ['/automations/automation-id-1']) => {
    const router = createMemoryRouter([
        {
            path: '/automations/:id',
            element: <AutomationEditor />
        },
        {
            path: '/automations',
            element: <div data-testid='automations-list-route'>Automations list route</div>
        }
    ], {
        initialEntries
    });

    return {
        router,
        ...render(<RouterProvider router={router} />)
    };
};

const withEmptyEmailBodies = (fixture: AutomationDetail): AutomationDetail => ({
    ...fixture,
    actions: fixture.actions.map(action => (
        action.type === 'send_email'
            ? {
                ...action,
                data: {
                    ...action.data,
                    email_lexical: '{"root":{"children":[]}}'
                }
            }
            : action
    ))
});

describe('AutomationEditor', () => {
    beforeEach(() => {
        mockUseReadAutomation.mockReset();
        mockEditMutation.mutate.mockReset();
        mockReactFlow.fitView.mockReset();
        mockReactFlow.zoomIn.mockReset();
        mockReactFlow.zoomOut.mockReset();
        mockReactFlow.zoomTo.mockReset();
        mockViewportZoom = 1;
        mockEditMutation.isLoading = false;
        mockEditMutation.variables = undefined;
        mockToastError.mockReset();
        mockLabs.current = {};
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

    it('does not flash the load error on the first render after automation data loads', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        const router = createMemoryRouter([{
            path: '/automations/:id',
            element: <AutomationEditor />
        }], {
            initialEntries: ['/automations/automation-id-1']
        });
        const root = createRoot(container);

        flushSync(() => {
            root.render(<RouterProvider router={router} />);
        });

        try {
            expect(within(container).queryByRole('alert')).not.toBeInTheDocument();
        } finally {
            root.unmount();
            container.remove();
        }
    });

    it('renders the trigger, wait, send-email, and tail nodes following the action chain', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        expect(screen.getByText('Free member welcome flow')).toBeInTheDocument();
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

    it('renders send-email node stats only when the automationAnalytics labs flag is enabled', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {
                automations: [{
                    ...automationDetail,
                    actions: automationDetail.actions.map(action => (action.type === 'send_email'
                        ? {
                            ...action,
                            stats: {
                                email_sent_count: 1247,
                                email_opened_count: 780,
                                opened_rate: 65,
                                clicked_rate: null
                            }
                        }
                        : action))
                }]
            },
            isLoading: false,
            isError: false
        });

        const {unmount} = renderEditor();
        expect(screen.queryByText('Sent')).not.toBeInTheDocument();
        unmount();

        mockLabs.current = {automationAnalytics: true};
        renderEditor();

        const emailStep = screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'});
        expect(within(emailStep).getByText('Sent').nextElementSibling).toHaveTextContent('1,247');
        expect(within(emailStep).getByText('Opened').nextElementSibling).toHaveTextContent('65%');
        // @TODO: NY-1457 — Clicked is deferred until click data is available
        expect(within(emailStep).queryByText('Clicked')).not.toBeInTheDocument();
    });

    it('does not render send-email node stats when the action has no stats', () => {
        mockLabs.current = {automationAnalytics: true};
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const emailStep = screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'});
        expect(within(emailStep).queryByText('Sent')).not.toBeInTheDocument();
    });

    it('renders zero sends and an unavailable open rate when there are no sends', () => {
        mockLabs.current = {automationAnalytics: true};
        mockUseReadAutomation.mockReturnValue({
            data: {
                automations: [{
                    ...automationDetail,
                    actions: automationDetail.actions.map(action => (action.type === 'send_email'
                        ? {
                            ...action,
                            stats: {
                                email_sent_count: 0,
                                email_opened_count: 0,
                                opened_rate: null,
                                clicked_rate: null
                            }
                        }
                        : action))
                }]
            },
            isLoading: false,
            isError: false
        });

        renderEditor();

        const emailStep = screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'});
        expect(within(emailStep).getByText('Sent').nextElementSibling).toHaveTextContent('0');
        expect(within(emailStep).getByText('Opened').nextElementSibling).toHaveTextContent('--');
    });

    it('renders styled canvas zoom controls without the interaction toggle', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        expect(screen.getByTestId('react-flow-mock')).toHaveAttribute('data-zoom-on-double-click', 'false');
        const controls = screen.getByTestId('react-flow-controls');
        expect(controls).toHaveAttribute('data-show-interactive', 'false');
        expect(controls).toHaveAttribute('data-show-fit-view', 'false');
        expect(controls).toHaveAttribute('data-show-zoom', 'false');
        expect(controls).toHaveStyle({bottom: '24px', left: '24px'});
        expect(controls).toHaveClass('overflow-hidden', 'rounded-md');
        expect(screen.getByRole('button', {name: 'Zoom out'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Zoom level 100%'})).toHaveTextContent('100%');
        expect(screen.getByRole('button', {name: 'Zoom in'})).toBeInTheDocument();
    });

    it('animates viewport changes from the custom canvas controls', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Zoom in'}));
        fireEvent.click(screen.getByRole('button', {name: 'Zoom out'}));

        expect(mockReactFlow.zoomIn).toHaveBeenCalledWith({duration: 180});
        expect(mockReactFlow.zoomOut).toHaveBeenCalledWith({duration: 180});
    });

    it('opens a zoom preset menu from the canvas controls', () => {
        mockViewportZoom = 0.75;
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Zoom level 75%'}), {button: 0, ctrlKey: false});

        expect(screen.getByRole('menuitem', {name: '150%'})).toBeInTheDocument();
        expect(screen.getByRole('menuitem', {name: '100%'})).toBeInTheDocument();
        expect(screen.getByRole('menuitem', {name: '75%'})).toBeInTheDocument();
        expect(screen.getByRole('menuitem', {name: '50%'})).toBeInTheDocument();
        expect(screen.getByRole('menuitem', {name: '25%'})).toBeInTheDocument();
        expect(screen.getByRole('menuitem', {name: 'Fit to view'})).toBeInTheDocument();
        expect(screen.getByRole('menuitem', {name: '75%'}).querySelector('svg')).toBeInTheDocument();
    });

    it('animates zoom preset and fit view menu selections', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Zoom level 100%'}), {button: 0, ctrlKey: false});
        fireEvent.click(screen.getByRole('menuitem', {name: '150%'}));

        expect(mockReactFlow.zoomTo).toHaveBeenCalledWith(1.5, {duration: 180});

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Zoom level 100%'}), {button: 0, ctrlKey: false});
        fireEvent.click(screen.getByRole('menuitem', {name: 'Fit to view'}));

        expect(mockReactFlow.fitView).toHaveBeenCalledWith({duration: 180});
    });

    it('opens a read-only sidebar for the trigger step', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const trigger = screen.getByRole('button', {name: 'Trigger: Member signs up'});
        fireEvent.click(trigger);

        expect(trigger).toHaveAttribute('aria-pressed', 'true');
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        expect(within(sidebar).getByRole('heading', {name: 'Member signs up'})).toBeInTheDocument();
        expect(within(sidebar).getByText('Members')).toBeInTheDocument();
        expect(within(sidebar).getByText('Free')).toBeInTheDocument();
        expect(within(sidebar).queryByText('Paid')).not.toBeInTheDocument();
        expect(within(sidebar).queryByRole('button', {name: /Delete/})).not.toBeInTheDocument();
        expect(within(sidebar).queryByRole('button', {name: /Edit/})).not.toBeInTheDocument();
    });

    it('opens step properties from the node right-click menu', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const waitStep = screen.getByRole('button', {name: 'Wait: 1 day'});
        fireEvent.contextMenu(waitStep, {clientX: 12, clientY: 12});
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Edit settings'}));

        expect(waitStep).toHaveAttribute('aria-pressed', 'true');
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        expect(within(sidebar).getByRole('heading', {name: '1 day'})).toBeInTheDocument();
        expect(within(sidebar).getByText('Wait for')).toBeInTheDocument();
    });

    it('selects a node after its context menu is dismissed', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const waitStep = screen.getByRole('button', {name: 'Wait: 1 day'});
        fireEvent.contextMenu(waitStep);
        expect(await screen.findByRole('menuitem', {name: 'Edit settings'})).toBeInTheDocument();

        fireEvent.keyDown(document, {key: 'Escape'});
        await waitFor(() => {
            expect(screen.queryByRole('menuitem', {name: 'Edit settings'})).not.toBeInTheDocument();
        });

        fireEvent.click(waitStep);

        expect(waitStep).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('complementary', {name: 'Step details'})).toHaveAttribute('data-state', 'open');
    });

    it('shows delete in action node menus but not the trigger node menu', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.contextMenu(screen.getByRole('button', {name: 'Trigger: Member signs up'}));
        expect(await screen.findByRole('menuitem', {name: 'Edit settings'})).toBeInTheDocument();
        expect(screen.queryByRole('menuitem', {name: 'Delete'})).not.toBeInTheDocument();
        fireEvent.keyDown(document, {key: 'Escape'});

        const waitStep = screen.getByRole('button', {name: 'Wait: 1 day'});
        fireEvent.contextMenu(waitStep);
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Delete'}));

        expect(screen.queryByRole('button', {name: 'Wait: 1 day'})).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'})).toBeInTheDocument();
    });

    it('opens the email editor from the send email node right-click menu', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        const {router} = renderEditor();

        const emailStep = screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'});
        fireEvent.contextMenu(emailStep);
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Edit email body'}));

        expect(await screen.findByTestId('email-content-modal')).toBeInTheDocument();
        expect(router.state.location.search).toBe('?emailStep=action-email');
        expect(screen.queryByRole('complementary', {name: 'Step details'})).not.toBeInTheDocument();
        expect(emailStep).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByTestId('modal-initial-mode')).toHaveTextContent('edit');
        expect(screen.getByTestId('modal-initial-subject')).toHaveTextContent('Welcome to The Blueprint');
        expect(screen.getByTestId('modal-initial-lexical')).toHaveTextContent(NON_EMPTY_EMAIL_LEXICAL);
    });

    it('opens the email editor preview from the send email node right-click menu', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        const {router} = renderEditor();

        const emailStep = screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'});
        fireEvent.contextMenu(emailStep);
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Preview'}));

        expect(await screen.findByTestId('email-content-modal')).toBeInTheDocument();
        expect(router.state.location.search).toBe('?emailStep=action-email');
        expect(screen.queryByRole('complementary', {name: 'Step details'})).not.toBeInTheDocument();
        expect(emailStep).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByTestId('modal-initial-mode')).toHaveTextContent('preview');
    });

    it('closes an app-opened email editor by removing the emailStep entry from router history', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        const {router} = renderEditor();

        const emailStep = screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'});
        fireEvent.doubleClick(emailStep);
        expect(await screen.findByTestId('email-content-modal')).toBeInTheDocument();
        expect(router.state.location.search).toBe('?emailStep=action-email');

        fireEvent.click(screen.getByTestId('modal-close'));

        await waitFor(() => {
            expect(screen.queryByTestId('email-content-modal')).not.toBeInTheDocument();
        });
        expect(router.state.location.pathname).toBe('/automations/automation-id-1');
        expect(router.state.location.search).toBe('');
    });

    it('ignores an invalid emailStep query param safely', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        const {router} = renderEditor(['/automations/automation-id-1?emailStep=missing-action']);

        await waitFor(() => {
            expect(router.state.location.search).toBe('');
        });
        expect(screen.queryByTestId('email-content-modal')).not.toBeInTheDocument();
        expect(screen.getByTestId('automation-editor')).toBeInTheDocument();
    });

    it('asks for confirmation before deleting a send email step with a body from the node right-click menu', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const emailStep = screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'});
        fireEvent.contextMenu(emailStep);
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Delete'}));

        const dialog = screen.getByRole('alertdialog', {name: 'Delete this email?'});
        expect(within(dialog).getByText('This email will be removed from the automation. Save or publish the automation to apply this change.')).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Delete email'}));

        expect(screen.queryByRole('button', {name: 'Send email: Welcome to The Blueprint'})).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Wait: 1 day'})).toBeInTheDocument();
    });

    it('asks for confirmation before deleting a send email step with only a body from the node right-click menu', async () => {
        const bodyOnly: AutomationDetail = {
            ...automationDetail,
            actions: automationDetail.actions.map(action => (
                action.type === 'send_email'
                    ? {
                        ...action,
                        data: {
                            ...action.data,
                            email_subject: ''
                        }
                    }
                    : action
            ))
        };
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [bodyOnly]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const emailStep = screen.getByRole('button', {name: 'Send email: Untitled'});
        fireEvent.contextMenu(emailStep);
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Delete'}));

        expect(screen.getByRole('alertdialog', {name: 'Delete this email?'})).toBeInTheDocument();
    });

    it('deletes a send email step without confirmation from the node right-click menu when it has no body', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [withEmptyEmailBodies(automationDetail)]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const emailStep = screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'});
        fireEvent.contextMenu(emailStep);
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Delete'}));

        expect(screen.queryByRole('alertdialog', {name: 'Delete this email?'})).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Send email: Welcome to The Blueprint'})).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Wait: 1 day'})).toBeInTheDocument();
    });

    it('opens the email editor from an email node double-click without opening the sidebar', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const emailStep = screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'});
        fireEvent.doubleClick(emailStep);

        expect(await screen.findByTestId('email-content-modal')).toBeInTheDocument();
        expect(screen.queryByRole('complementary', {name: 'Step details'})).not.toBeInTheDocument();
        expect(emailStep).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByTestId('modal-initial-mode')).toHaveTextContent('edit');
    });

    it('shows paid member eligibility for the paid welcome automation trigger', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {
                automations: [{
                    ...automationDetail,
                    slug: 'member-welcome-email-paid',
                    name: 'Paid member welcome flow'
                }]
            },
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Trigger: Member signs up'}));

        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        expect(within(sidebar).getByText('Paid')).toBeInTheDocument();
        expect(within(sidebar).queryByText('Free')).not.toBeInTheDocument();
    });

    it('switches the read-only sidebar content when another step is clicked', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const waitStep = screen.getByRole('button', {name: 'Wait: 1 day'});
        fireEvent.click(waitStep);

        let sidebar = screen.getByRole('complementary', {name: 'Step details'});
        expect(waitStep).toHaveAttribute('aria-pressed', 'true');
        expect(within(sidebar).getByRole('heading', {name: '1 day'})).toBeInTheDocument();
        expect(within(sidebar).getByText('Wait')).toBeInTheDocument();
        expect(within(sidebar).getByText('Wait for')).toBeInTheDocument();
        expect(within(sidebar).getByRole('button', {name: 'Delete step'})).toBeEnabled();

        const emailStep = screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'});
        fireEvent.click(emailStep);

        sidebar = screen.getByRole('complementary', {name: 'Step details'});
        expect(waitStep).toHaveAttribute('aria-pressed', 'false');
        expect(emailStep).toHaveAttribute('aria-pressed', 'true');
        expect(within(sidebar).getByRole('heading', {name: 'Welcome to The Blueprint'})).toBeInTheDocument();
        expect(within(sidebar).getByDisplayValue('Welcome to The Blueprint')).toHaveFocus();
        expect(within(sidebar).queryByText('Sender')).not.toBeInTheDocument();
        expect(within(sidebar).queryByText('Reply-to')).not.toBeInTheDocument();
        expect(within(sidebar).getByRole('button', {name: 'Edit email'})).toBeEnabled();
        expect(within(sidebar).getByRole('button', {name: 'Delete step'})).toBeEnabled();
    });

    it('persists an edited subject from the sidebar on publish', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'}));
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        const subjectInput = within(sidebar).getByDisplayValue('Welcome to The Blueprint');

        fireEvent.change(subjectInput, {target: {value: 'Updated subject'}});
        fireEvent.blur(subjectInput);

        const publish = screen.getByRole('button', {name: 'Publish changes'});
        expect(publish).toBeEnabled();
        fireEvent.click(publish);

        const dialog = screen.getByRole('alertdialog', {name: 'Update your automation?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Publish changes'}));

        expect(mockEditMutation.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'automation-id-1',
                status: 'active',
                actions: expect.arrayContaining([
                    expect.objectContaining({
                        id: 'action-email',
                        type: 'send_email',
                        data: expect.objectContaining({email_subject: 'Updated subject'}) as unknown
                    })
                ]) as unknown
            }),
            expect.any(Object)
        );
    });

    it('opens the email editor modal seeded from the step and commits edits to the draft (not the API) until publish', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'}));
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        fireEvent.click(within(sidebar).getByRole('button', {name: 'Edit email'}));

        // The modal opens, seeded from the step's current content.
        expect(screen.getByTestId('email-content-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-initial-subject')).toHaveTextContent('Welcome to The Blueprint');
        expect(screen.getByTestId('modal-initial-lexical')).toHaveTextContent(NON_EMPTY_EMAIL_LEXICAL);

        // Saving in the modal commits to the local draft only — no API call.
        expect(mockEditMutation.mutate).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('modal-save'));
        expect(mockEditMutation.mutate).not.toHaveBeenCalled();
        // The modal stays open after saving; Close is the only way out.
        expect(screen.getByTestId('email-content-modal')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('modal-close'));

        // Publishing persists the edited content.
        fireEvent.click(screen.getByRole('button', {name: 'Publish changes'}));
        const dialog = screen.getByRole('alertdialog', {name: 'Update your automation?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Publish changes'}));
        expect(mockEditMutation.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
                actions: expect.arrayContaining([
                    expect.objectContaining({
                        id: 'action-email',
                        data: expect.objectContaining({
                            email_subject: 'Edited via modal',
                            email_lexical: NON_EMPTY_EMAIL_LEXICAL
                        }) as unknown
                    })
                ]) as unknown
            }),
            expect.any(Object)
        );
    });

    it('reflects a subject edited in the modal back in the sidebar input', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'}));
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        expect(within(sidebar).getByDisplayValue('Welcome to The Blueprint')).toBeInTheDocument();

        fireEvent.click(within(sidebar).getByRole('button', {name: 'Edit email'}));
        fireEvent.click(screen.getByTestId('modal-save'));

        expect(within(sidebar).getByDisplayValue('Edited via modal')).toBeInTheDocument();
        expect(within(sidebar).queryByDisplayValue('Welcome to The Blueprint')).not.toBeInTheDocument();
    });

    it('resets the wait editor value when switching between wait steps', () => {
        const fixture: AutomationDetail = {
            ...automationDetail,
            actions: [
                {id: 'action-wait-one-day', type: 'wait', data: {wait_hours: 24}},
                {id: 'action-wait-three-days', type: 'wait', data: {wait_hours: 72}},
                automationDetail.actions[1]
            ],
            edges: [
                {source_action_id: 'action-wait-one-day', target_action_id: 'action-wait-three-days'},
                {source_action_id: 'action-wait-three-days', target_action_id: 'action-email'}
            ]
        };
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [fixture]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Wait: 1 day'}));
        let sidebar = screen.getByRole('complementary', {name: 'Step details'});
        expect(within(sidebar).getByRole('heading', {name: '1 day'})).toBeInTheDocument();
        expect(within(sidebar).getByDisplayValue('1')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Wait: 3 days'}));
        sidebar = screen.getByRole('complementary', {name: 'Step details'});
        expect(within(sidebar).getByRole('heading', {name: '3 days'})).toBeInTheDocument();
        expect(within(sidebar).getByDisplayValue('3')).toBeInTheDocument();
    });

    it('updates a wait step as the wait editor value changes', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Wait: 1 day'}));
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        const waitInput = within(sidebar).getByDisplayValue('1');

        fireEvent.change(waitInput, {target: {value: '3'}});

        expect(screen.getByRole('button', {name: 'Wait: 3 days'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Publish changes'})).toBeEnabled();

        fireEvent.click(screen.getByRole('button', {name: 'Publish changes'}));
        const dialog = screen.getByRole('alertdialog', {name: 'Update your automation?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Publish changes'}));

        const mutateCall = mockEditMutation.mutate.mock.calls.at(-1)![0];
        expect(mutateCall.actions).toContainEqual({id: 'action-wait', type: 'wait', data: {wait_hours: 72}});
    });

    it('increments and decrements the wait step from the day input group buttons', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Wait: 1 day'}));
        let sidebar = screen.getByRole('complementary', {name: 'Step details'});
        expect(within(sidebar).getByLabelText('Wait for')).toHaveValue('1');
        expect(within(sidebar).getByRole('button', {name: 'Decrease wait by one day'})).toBeDisabled();

        fireEvent.click(within(sidebar).getByRole('button', {name: 'Increase wait by one day'}));

        expect(screen.getByRole('button', {name: 'Wait: 2 days'})).toBeInTheDocument();
        sidebar = screen.getByRole('complementary', {name: 'Step details'});
        expect(within(sidebar).getByDisplayValue('2')).toBeInTheDocument();

        fireEvent.click(within(sidebar).getByRole('button', {name: 'Decrease wait by one day'}));

        expect(screen.getByRole('button', {name: 'Wait: 1 day'})).toBeInTheDocument();
        sidebar = screen.getByRole('complementary', {name: 'Step details'});
        expect(within(sidebar).getByDisplayValue('1')).toBeInTheDocument();
        expect(within(sidebar).getByRole('button', {name: 'Decrease wait by one day'})).toBeDisabled();
    });

    it('rejects non-decimal wait editor values', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Wait: 1 day'}));
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        const waitInput = within(sidebar).getByDisplayValue('1');

        for (const value of ['2e1', '+2']) {
            fireEvent.focus(waitInput);
            fireEvent.change(waitInput, {target: {value}});

            expect(waitInput).toHaveAttribute('aria-invalid', 'false');
            expect(within(sidebar).queryByText('Enter a delay between 1 and 30 days')).not.toBeInTheDocument();

            fireEvent.blur(waitInput);

            expect(waitInput).toHaveAttribute('aria-invalid', 'true');
            expect(waitInput).toHaveAttribute('aria-describedby', 'automation-wait-days-error');
            expect(within(sidebar).getByText('Enter a delay between 1 and 30 days')).toBeInTheDocument();
            expect(screen.getByRole('button', {name: 'Published'})).toBeDisabled();
        }
    });

    it('closes the sidebar from a blank canvas click', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const trigger = screen.getByRole('button', {name: 'Trigger: Member signs up'});
        fireEvent.click(trigger);
        expect(screen.getByRole('complementary', {name: 'Step details'})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Close step sidebar'})).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId('react-flow-mock'));
        expect(screen.queryByRole('complementary', {name: 'Step details'})).not.toBeInTheDocument();
        expect(trigger).toHaveAttribute('aria-pressed', 'false');
    });

    it('closes the sidebar with Escape', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const waitStep = screen.getByRole('button', {name: 'Wait: 1 day'});
        fireEvent.click(waitStep);

        fireEvent.keyDown(document, {key: 'Escape'});

        expect(screen.queryByRole('complementary', {name: 'Step details'})).not.toBeInTheDocument();
        expect(waitStep).toHaveAttribute('aria-pressed', 'false');
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

    it('confirms before publishing an inactive automation', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const button = screen.getByRole('button', {name: 'Publish'});
        expect(button).not.toBeDisabled();
        fireEvent.click(button);

        const dialog = await screen.findByRole('alertdialog', {name: 'Start your automation?'});
        expect(within(dialog).getByText(/Once published, your automation goes live/)).toBeInTheDocument();
        expect(within(dialog).getByText(/enrolled automatically/)).toBeInTheDocument();
        expect(mockEditMutation.mutate).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Publish'}));

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

    it('closes the publish confirmation without publishing when cancelled', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Publish'}));

        const dialog = await screen.findByRole('alertdialog', {name: 'Start your automation?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Cancel'}));

        expect(mockEditMutation.mutate).not.toHaveBeenCalled();
        await waitFor(() => {
            expect(screen.queryByText('Start your automation?')).not.toBeInTheDocument();
        });
        expect(screen.getByRole('button', {name: 'Publish'})).toBeEnabled();
    });

    it('blocks publishing an inactive automation with an empty email body', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [withEmptyEmailBodies({...automationDetail, status: 'inactive'})]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Publish'}));

        expect(screen.queryByRole('alertdialog', {name: 'Start your automation?'})).not.toBeInTheDocument();
        expect(mockEditMutation.mutate).not.toHaveBeenCalled();
        expect(mockToastError).toHaveBeenCalledWith('Automation needs a few details', {
            description: 'Fix the highlighted steps and try again.'
        });

        const emailStep = screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'});
        expect(emailStep).toHaveAttribute('aria-invalid', 'true');
        expect(emailStep).toHaveClass('border-destructive');
        expect(within(emailStep).getByText('Add an email body.')).toHaveClass('text-destructive');
    });

    it('saves an inactive automation without publishing it', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByTestId('add-step-tail-button'));
        const picker = await screen.findByTestId('step-picker');
        fireEvent.click(within(picker).getByText('Wait'));

        const button = screen.getByRole('button', {name: 'Save'});
        expect(button).toBeEnabled();
        fireEvent.click(button);

        const mutateCall = mockEditMutation.mutate.mock.calls.at(-1)![0];
        expect(mutateCall.id).toBe('automation-id-1');
        expect(mutateCall.status).toBe('inactive');
        expect(mutateCall.actions).toHaveLength(3);
        expect(mutateCall.edges).toHaveLength(2);
    });

    it('saves an inactive draft with an empty email subject and body', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        // A freshly added email step has an empty subject and body — saving a draft must still be allowed.
        fireEvent.click(screen.getByTestId('add-step-tail-button'));
        const picker = await screen.findByTestId('step-picker');
        fireEvent.click(within(picker).getByText('Email'));

        fireEvent.click(screen.getByRole('button', {name: 'Save'}));

        expect(mockToastError).not.toHaveBeenCalled();
        const mutateCall = mockEditMutation.mutate.mock.calls.at(-1)![0];
        expect(mutateCall.status).toBe('inactive');
        expect(screen.queryByText('Add a subject line and email body.')).not.toBeInTheDocument();
    });

    it('shows the Turn off button for active automations', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        expect(screen.getByRole('button', {name: 'Turn off'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Published'})).toBeDisabled();
        expect(screen.queryByRole('button', {name: 'Save'})).not.toBeInTheDocument();
    });

    it('hides the Turn off button for inactive automations', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        expect(screen.queryByRole('button', {name: 'Turn off'})).not.toBeInTheDocument();
    });

    it('disables the modal button and shows loading UI while a publish request is in flight', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Publish'}));

        const dialog = await screen.findByRole('alertdialog', {name: 'Start your automation?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Publish'}));

        expect(within(dialog).getByRole('button', {name: 'Cancel'})).toBeDisabled();
        const button = within(dialog).getByRole('button', {name: 'Publishing...'});
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

        fireEvent.click(screen.getByRole('button', {name: 'Turn off'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Turn off'}));

        expect(screen.getByRole('button', {name: 'Cancel'})).toBeDisabled();
        const turnOff = screen.getByRole('button', {name: 'Turning off...'});
        expect(turnOff).toBeDisabled();
        expect(turnOff.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows a retry state and error in the modal when publishing fails', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });
        mockEditMutation.mutate.mockImplementation((_payload, options) => {
            options.onError?.();
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Publish'}));

        const dialog = await screen.findByRole('alertdialog', {name: 'Start your automation?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Publish'}));

        const button = within(dialog).getByRole('button', {name: 'Retry'});
        expect(button).not.toBeDisabled();
        expect(button).toHaveClass('bg-destructive');
        expect(mockToastError).toHaveBeenCalledWith('Automation couldn’t be saved');
        expect(mockToastError).not.toHaveBeenCalledWith('Automation needs a few details', {
            description: 'Fix the highlighted steps and try again.'
        });
        expect(screen.queryByText(/Couldn.t publish automation/)).not.toBeInTheDocument();
    });

    it('turns off an active automation when confirming from the toolbar', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Turn off'}));

        const dialog = await screen.findByRole('alertdialog');
        expect(within(dialog).getByText('Turn off automation?')).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole('button', {name: 'Turn off'}));

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

        fireEvent.click(screen.getByRole('button', {name: 'Turn off'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Turn off'}));

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
            options.onError?.();
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Turn off'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Turn off'}));

        const button = await screen.findByRole('button', {name: 'Retry'});
        expect(button).not.toBeDisabled();
        expect(button).toHaveClass('bg-destructive');
        expect(screen.getByText('Turn off automation?')).toBeInTheDocument();
        expect(screen.queryByText(/Couldn.t turn off automation/)).not.toBeInTheDocument();
    });

    it('closes the confirmation modal after unpublishing succeeds', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });
        mockEditMutation.mutate.mockImplementation((payload, options) => {
            options.onSuccess?.({automations: [{...automationDetail, status: payload.status}]});
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Turn off'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Turn off'}));

        await waitFor(() => {
            expect(screen.queryByText('Turn off automation?')).not.toBeInTheDocument();
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

    it('confirms before navigating away from an automation with unsaved changes', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        await stageLocalEdit();
        fireEvent.click(screen.getByRole('link', {name: 'Back to automations'}));

        const dialog = screen.getByRole('alertdialog', {name: 'Discard unsaved changes?'});
        expect(within(dialog).getByText('Your changes will be lost if you leave this automation.')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', {name: 'Keep working'})).toBeInTheDocument();
        expect(within(dialog).getByRole('button', {name: 'Discard changes'})).toHaveClass('bg-destructive');
        expect(screen.queryByTestId('automations-list-route')).not.toBeInTheDocument();
    });

    it('keeps editing when cancelling navigation away from an automation with unsaved changes', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        await stageLocalEdit();
        fireEvent.click(screen.getByRole('link', {name: 'Back to automations'}));
        const dialog = screen.getByRole('alertdialog', {name: 'Discard unsaved changes?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Keep working'}));

        await waitFor(() => {
            expect(screen.queryByRole('alertdialog', {name: 'Discard unsaved changes?'})).not.toBeInTheDocument();
        });
        expect(screen.getByTestId('automation-editor')).toBeInTheDocument();
        expect(screen.queryByTestId('automations-list-route')).not.toBeInTheDocument();
    });

    it('discards changes and continues navigation when confirming navigation away from an automation', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        await stageLocalEdit();
        fireEvent.click(screen.getByRole('link', {name: 'Back to automations'}));
        const dialog = screen.getByRole('alertdialog', {name: 'Discard unsaved changes?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Discard changes'}));

        await waitFor(() => {
            expect(screen.getByTestId('automations-list-route')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('automation-editor')).not.toBeInTheDocument();
    });

    it('uses the email discard dialog, not the automation discard dialog, when Back closes a dirty email editor', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        const {router} = renderEditor(['/automations', '/automations/automation-id-1']);

        await stageLocalEdit();
        fireEvent.doubleClick(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'}));
        fireEvent.click(await screen.findByTestId('modal-dirty'));

        await act(async () => {
            await router.navigate(-1);
        });

        let emailDialog = screen.getByRole('alertdialog', {name: 'Discard changes?'});
        expect(within(emailDialog).getByText('Your changes to this email haven\'t been saved.')).toBeInTheDocument();
        expect(screen.queryByRole('alertdialog', {name: 'Discard unsaved changes?'})).not.toBeInTheDocument();
        expect(router.state.location.search).toBe('?emailStep=action-email');

        fireEvent.click(within(emailDialog).getByRole('button', {name: 'Keep editing'}));

        await waitFor(() => {
            expect(screen.queryByRole('alertdialog', {name: 'Discard changes?'})).not.toBeInTheDocument();
        });
        expect(screen.getByTestId('email-content-modal')).toBeInTheDocument();
        expect(router.state.location.search).toBe('?emailStep=action-email');

        await act(async () => {
            await router.navigate(-1);
        });
        emailDialog = screen.getByRole('alertdialog', {name: 'Discard changes?'});
        fireEvent.click(within(emailDialog).getByRole('button', {name: 'Discard'}));

        await waitFor(() => {
            expect(screen.queryByTestId('email-content-modal')).not.toBeInTheDocument();
        });
        expect(router.state.location.pathname).toBe('/automations/automation-id-1');
        expect(router.state.location.search).toBe('');
        expect(screen.getAllByRole('button', {name: 'Wait: 1 day'})).toHaveLength(2);
        expect(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'})).toBeInTheDocument();
        expect(screen.queryByTestId('automations-list-route')).not.toBeInTheDocument();
    });

    it('removes emailStep query param after confirming discard from the dirty email editor close button', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        const {router} = renderEditor(['/automations', '/automations/automation-id-1']);

        fireEvent.doubleClick(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'}));
        fireEvent.click(await screen.findByTestId('modal-dirty'));
        fireEvent.click(screen.getByTestId('modal-close'));

        const emailDialog = screen.getByRole('alertdialog', {name: 'Discard changes?'});
        fireEvent.click(within(emailDialog).getByRole('button', {name: 'Discard'}));

        await waitFor(() => {
            expect(screen.queryByTestId('email-content-modal')).not.toBeInTheDocument();
        });
        expect(router.state.location.pathname).toBe('/automations/automation-id-1');
        expect(router.state.location.search).toBe('');
        expect(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'})).toBeInTheDocument();
        expect(screen.queryByRole('alertdialog', {name: 'Discard unsaved changes?'})).not.toBeInTheDocument();
    });

    it('closes only the dirty email editor when discarding from a blocked route navigation', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        const {router} = renderEditor(['/automations', '/automations/automation-id-1']);

        await stageLocalEdit();
        fireEvent.doubleClick(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'}));
        fireEvent.click(await screen.findByTestId('modal-dirty'));
        fireEvent.click(screen.getByRole('link', {name: 'Back to automations'}));

        const emailDialog = screen.getByRole('alertdialog', {name: 'Discard changes?'});
        expect(screen.queryByRole('alertdialog', {name: 'Discard unsaved changes?'})).not.toBeInTheDocument();
        fireEvent.click(within(emailDialog).getByRole('button', {name: 'Discard'}));

        await waitFor(() => {
            expect(screen.queryByTestId('email-content-modal')).not.toBeInTheDocument();
        });
        expect(router.state.location.pathname).toBe('/automations/automation-id-1');
        expect(router.state.location.search).toBe('');
        expect(screen.getAllByRole('button', {name: 'Wait: 1 day'})).toHaveLength(2);
        expect(screen.queryByTestId('automations-list-route')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('link', {name: 'Back to automations'}));

        expect(screen.getByRole('alertdialog', {name: 'Discard unsaved changes?'})).toBeInTheDocument();
        expect(screen.queryByTestId('automations-list-route')).not.toBeInTheDocument();
    });

    it('shows the automation discard dialog with one Back press after saving and closing the email editor', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        const {router} = renderEditor(['/automations', '/automations/automation-id-1']);

        await stageLocalEdit();
        fireEvent.doubleClick(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'}));
        expect(router.state.location.search).toBe('?emailStep=action-email');
        fireEvent.click(await screen.findByTestId('modal-save'));
        fireEvent.click(screen.getByTestId('modal-close'));

        await waitFor(() => {
            expect(screen.queryByTestId('email-content-modal')).not.toBeInTheDocument();
        });
        expect(router.state.location.pathname).toBe('/automations/automation-id-1');
        expect(router.state.location.search).toBe('');

        await act(async () => {
            await router.navigate(-1);
        });

        const dialog = screen.getByRole('alertdialog', {name: 'Discard unsaved changes?'});
        expect(within(dialog).getByText('Your changes will be lost if you leave this automation.')).toBeInTheDocument();
        expect(screen.queryByTestId('automations-list-route')).not.toBeInTheDocument();
    });

    it('navigates away without confirmation when the automation has no unsaved changes', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('link', {name: 'Back to automations'}));

        await waitFor(() => {
            expect(screen.getByTestId('automations-list-route')).toBeInTheDocument();
        });
        expect(screen.queryByRole('alertdialog', {name: 'Discard unsaved changes?'})).not.toBeInTheDocument();
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
        const insertedNode = screen.getByRole('button', {name: 'Wait: 1 day'});
        expect(insertedNode).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getAllByText('1 day')).toHaveLength(2);
        // Adding a step flips the editor into a dirty state.
        expect(screen.getByRole('button', {name: 'Publish changes'})).toBeEnabled();
    });

    it('inserts a send_email step with default values when picked from the tail', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByTestId('add-step-tail-button'));
        const picker = await screen.findByTestId('step-picker');
        fireEvent.click(within(picker).getByText('Email'));

        // The new send_email step renders with the default empty subject.
        const insertedNode = screen.getByRole('button', {name: 'Send email: Untitled'});
        expect(insertedNode).toHaveClass('border-yellow-600');
        expect(within(insertedNode).getByText('Untitled')).toHaveClass('opacity-50');
        expect(within(insertedNode).getByText('Empty email body')).toHaveClass('text-yellow-600');
        expect(insertedNode).toHaveClass('animate-in');
        expect(insertedNode).toHaveClass('zoom-in-90');
        expect(insertedNode).toHaveAttribute('aria-pressed', 'true');
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        expect(within(sidebar).getByRole('heading', {name: 'Untitled'})).toHaveClass('opacity-50');
        expect(within(sidebar).getByPlaceholderText('Subject line')).toHaveFocus();
        expect(within(sidebar).getByPlaceholderText('Subject line')).toHaveValue('');
        expect(screen.getByRole('button', {name: 'Publish changes'})).toBeEnabled();
    });

    it('shows a toast and highlights email steps with missing content when publishing fails validation', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByTestId('add-step-tail-button'));
        const picker = await screen.findByTestId('step-picker');
        fireEvent.click(within(picker).getByText('Email'));

        fireEvent.click(screen.getByRole('button', {name: 'Publish'}));

        expect(mockEditMutation.mutate).not.toHaveBeenCalled();
        expect(mockToastError).toHaveBeenCalledWith('Automation needs a few details', {
            description: 'Fix the highlighted steps and try again.'
        });

        let emailStep = screen.getByRole('button', {name: 'Send email: Untitled'});
        expect(emailStep).toHaveAttribute('aria-invalid', 'true');
        expect(emailStep.firstElementChild).toHaveClass('items-start');
        expect(emailStep).toHaveClass('border-destructive');
        expect(emailStep).not.toHaveClass('border-yellow-600');
        expect(within(emailStep).getByText('Add a subject line and email body.').closest('div')?.previousElementSibling).toHaveClass('mt-[3px]');
        expect(within(emailStep).getByText('Add a subject line and email body.')).toHaveClass('text-destructive');
        expect(within(emailStep).queryByText('Empty email body')).not.toBeInTheDocument();
        expect(screen.queryByRole('alertdialog', {name: 'Start your automation?'})).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Publish'})).toBeEnabled();

        // Filling only the subject leaves the body invalid, so the step stays blocked.
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        fireEvent.change(within(sidebar).getByPlaceholderText('Subject line'), {
            target: {value: 'Welcome subject'}
        });

        emailStep = screen.getByRole('button', {name: 'Send email: Welcome subject'});
        expect(emailStep).toHaveAttribute('aria-invalid', 'true');
        expect(emailStep).toHaveClass('border-destructive');

        // Adding body content via the modal clears the error and lets the publish through.
        fireEvent.click(within(sidebar).getByRole('button', {name: 'Edit email'}));
        fireEvent.click(await screen.findByTestId('modal-save'));

        emailStep = screen.getByRole('button', {name: 'Send email: Edited via modal'});
        expect(emailStep).not.toHaveAttribute('aria-invalid', 'true');
        expect(within(emailStep).queryByText('Add an email body.')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Publish'}));
        const publishDialog = await screen.findByRole('alertdialog', {name: 'Start your automation?'});
        fireEvent.click(within(publishDialog).getByRole('button', {name: 'Publish'}));
        expect(mockEditMutation.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'active',
                actions: expect.arrayContaining([
                    expect.objectContaining({
                        type: 'send_email',
                        data: expect.objectContaining({email_subject: 'Edited via modal'}) as unknown
                    })
                ]) as unknown
            }),
            expect.any(Object)
        );
    });

    it('does not surface new step errors until the next publish validation', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'}));
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        const subjectInput = within(sidebar).getByDisplayValue('Welcome to The Blueprint');

        fireEvent.change(subjectInput, {target: {value: ''}});
        expect(within(screen.getByRole('button', {name: 'Send email: Untitled'})).queryByText('Add a subject line.')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Publish'}));
        expect(within(screen.getByRole('button', {name: 'Send email: Untitled'})).getByText('Add a subject line.')).toBeInTheDocument();

        fireEvent.change(subjectInput, {target: {value: 'Temporary subject'}});
        expect(within(screen.getByRole('button', {name: 'Send email: Temporary subject'})).queryByText('Add a subject line.')).not.toBeInTheDocument();

        fireEvent.change(subjectInput, {target: {value: ''}});
        expect(within(screen.getByRole('button', {name: 'Send email: Untitled'})).queryByText('Add a subject line.')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Publish'}));
        expect(within(screen.getByRole('button', {name: 'Send email: Untitled'})).getByText('Add a subject line.')).toBeInTheDocument();
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

    it('keeps the in-edge + button visible after leaving the button while still hovering the edge', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const edge = screen.getByTestId('react-flow-mock-edges').querySelector('[data-edge-id="e-action-wait-action-email"]');
        const edgeGroup = edge?.querySelector('g');
        const button = screen.getByTestId('add-step-button-action-wait-action-email');
        const labelHitZone = button.closest('.pointer-events-auto');

        expect(edgeGroup).toBeInTheDocument();
        expect(labelHitZone).toBeInTheDocument();

        fireEvent.mouseEnter(edgeGroup!);
        expect(button).toHaveClass('opacity-100');

        fireEvent.mouseEnter(labelHitZone!);
        fireEvent.mouseLeave(labelHitZone!, {relatedTarget: edgeGroup});
        expect(button).toHaveClass('opacity-100');

        fireEvent.mouseLeave(edgeGroup!);
        expect(button).toHaveClass('opacity-0');
    });

    it('deletes a wait step and reconnects the chain', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        const waitStep = screen.getByRole('button', {name: 'Wait: 1 day'});
        fireEvent.click(waitStep);

        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        fireEvent.click(within(sidebar).getByRole('button', {name: 'Delete step'}));

        // The wait step is gone; only the email step remains in the action chain.
        expect(screen.queryByRole('button', {name: 'Wait: 1 day'})).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'})).toBeInTheDocument();

        // Edges now wire trigger → action-email → tail directly.
        const edgeList = screen.getByTestId('react-flow-mock-edges');
        const edgePairs = Array.from(edgeList.querySelectorAll('li')).map(li => [
            li.getAttribute('data-source'),
            li.getAttribute('data-target')
        ]);
        expect(edgePairs).toEqual([
            ['__trigger__', 'action-email'],
            ['action-email', '__tail__']
        ]);

        // Sidebar closes after delete.
        expect(screen.queryByRole('complementary', {name: 'Step details'})).not.toBeInTheDocument();

        // Active automation with a structural change → "Publish changes" enabled.
        expect(screen.getByRole('button', {name: 'Publish changes'})).toBeEnabled();
    });

    it('asks for confirmation before deleting a send email step', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'}));
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        fireEvent.click(within(sidebar).getByRole('button', {name: 'Delete step'}));

        const dialog = screen.getByRole('alertdialog', {name: 'Delete this email?'});
        expect(within(dialog).getByText('This email will be removed from the automation. Save or publish the automation to apply this change.')).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Cancel'}));

        expect(screen.queryByRole('alertdialog', {name: 'Delete this email?'})).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'})).toBeInTheDocument();
        expect(screen.getByRole('complementary', {name: 'Step details'})).toBeInTheDocument();
    });

    it('deletes a send email step without confirmation from the sidebar when it has no body', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [withEmptyEmailBodies(automationDetail)]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'}));
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        fireEvent.click(within(sidebar).getByRole('button', {name: 'Delete step'}));

        expect(screen.queryByRole('alertdialog', {name: 'Delete this email?'})).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Send email: Welcome to The Blueprint'})).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Wait: 1 day'})).toBeInTheDocument();
    });

    it('deletes a send email step after confirmation and keeps the wait step in place', () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'}));
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        fireEvent.click(within(sidebar).getByRole('button', {name: 'Delete step'}));
        const dialog = screen.getByRole('alertdialog', {name: 'Delete this email?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Delete email'}));

        expect(screen.queryByRole('button', {name: 'Send email: Welcome to The Blueprint'})).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Wait: 1 day'})).toBeInTheDocument();

        const edgeList = screen.getByTestId('react-flow-mock-edges');
        const edgePairs = Array.from(edgeList.querySelectorAll('li')).map(li => [
            li.getAttribute('data-source'),
            li.getAttribute('data-target')
        ]);
        expect(edgePairs).toEqual([
            ['__trigger__', 'action-wait'],
            ['action-wait', '__tail__']
        ]);

        expect(screen.queryByRole('complementary', {name: 'Step details'})).not.toBeInTheDocument();
    });

    it('deletes the only remaining step and leaves only the trigger and tail', () => {
        const oneStep: AutomationDetail = {
            ...automationDetail,
            actions: [{id: 'action-wait', type: 'wait', data: {wait_hours: 24}}],
            edges: []
        };
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [oneStep]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Wait: 1 day'}));
        const sidebar = screen.getByRole('complementary', {name: 'Step details'});
        fireEvent.click(within(sidebar).getByRole('button', {name: 'Delete step'}));

        expect(screen.queryByRole('button', {name: 'Wait: 1 day'})).not.toBeInTheDocument();

        // With no steps, the canvas falls back to a single trigger → tail edge.
        const edgeList = screen.getByTestId('react-flow-mock-edges');
        const edgePairs = Array.from(edgeList.querySelectorAll('li')).map(li => [
            li.getAttribute('data-source'),
            li.getAttribute('data-target')
        ]);
        expect(edgePairs).toEqual([['__trigger__', '__tail__']]);
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
            options.onSuccess?.({automations: [published]});
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

        const dialog = await screen.findByRole('alertdialog', {name: 'Start your automation?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Publish'}));

        const mutateCall = mockEditMutation.mutate.mock.calls.at(-1)![0];
        expect(mutateCall.id).toBe('automation-id-1');
        expect(mutateCall.status).toBe('active');
        // Three actions now: the original wait + send_email + the locally-added wait.
        expect(mutateCall.actions).toHaveLength(3);

        // After publish the draft matches the response, so the button settles on Published + disabled.
        expect(screen.getByRole('button', {name: 'Published'})).toBeDisabled();
    });

    it('replaces the tail + affordance with limit text when the action limit is reached', () => {
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

        expect(screen.queryByTestId('add-step-tail-button')).not.toBeInTheDocument();
        const limitNode = screen.getByTestId('step-limit-tail-node');
        expect(limitNode).toHaveClass('border-border-default');
        expect(limitNode).toHaveClass('bg-[repeating-linear-gradient(135deg,var(--color-white)_0,var(--color-white)_12px,var(--color-gray-100)_12px,var(--color-gray-100)_24px)]');
        expect(limitNode.querySelector('svg')).toBeInTheDocument();
        expect(limitNode).toHaveTextContent('Maximum steps added');
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

        const {rerender, router} = renderEditor();

        // Baseline: clean active automation → Published, disabled.
        expect(screen.getByRole('button', {name: 'Published'})).toBeDisabled();

        // Simulate a focus-refetch that updates only `updated_at` (server-stamped, not user-editable).
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...initial, updated_at: '2026-05-06T12:34:56.000Z'}]},
            isLoading: false,
            isError: false
        });
        rerender(<RouterProvider router={router} />);

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
            options.onSuccess?.({automations: [{
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
        const dialog = screen.getByRole('alertdialog', {name: 'Update your automation?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Publish changes'}));

        const mutateCall = mockEditMutation.mutate.mock.calls.at(-1)![0];
        // Original 2 actions + 3 locally inserted = 5.
        expect(mutateCall.actions).toHaveLength(5);
        // The edge graph should form one continuous chain (n-1 edges connecting all actions).
        expect(mutateCall.edges).toHaveLength(4);
        const sources = new Set(mutateCall.edges.map((e: {source_action_id: string}) => e.source_action_id));
        const targets = new Set(mutateCall.edges.map((e: {target_action_id: string}) => e.target_action_id));
        // Every source/target references a real action in the payload.
        const actionIds = new Set(mutateCall.actions.map((a: {id: string}) => a.id));
        sources.forEach(id => expect(actionIds.has(id)).toBe(true));
        targets.forEach(id => expect(actionIds.has(id)).toBe(true));
    });

    it('confirms before publishing changes to an active automation', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        await stageLocalEdit();

        fireEvent.click(screen.getByRole('button', {name: 'Publish changes'}));

        const dialog = screen.getByRole('alertdialog', {name: 'Update your automation?'});
        expect(within(dialog).getByText(/apply immediately/)).toBeInTheDocument();
        expect(mockEditMutation.mutate).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Publish changes'}));

        expect(mockEditMutation.mutate).toHaveBeenCalledWith(
            {
                id: 'automation-id-1',
                status: 'active',
                actions: expect.any(Array) as unknown,
                edges: expect.any(Array) as unknown
            },
            expect.any(Object)
        );
    });

    it('blocks publishing changes to an active automation with an empty email body', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [withEmptyEmailBodies(automationDetail)]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        await stageLocalEdit();
        fireEvent.click(screen.getByRole('button', {name: 'Publish changes'}));

        expect(screen.queryByRole('alertdialog', {name: 'Update your automation?'})).not.toBeInTheDocument();
        expect(mockEditMutation.mutate).not.toHaveBeenCalled();
        expect(mockToastError).toHaveBeenCalledWith('Automation needs a few details', {
            description: 'Fix the highlighted steps and try again.'
        });
        expect(screen.getByRole('button', {name: 'Publish changes'})).toBeEnabled();

        const emailStep = screen.getByRole('button', {name: 'Send email: Welcome to The Blueprint'});
        expect(emailStep).toHaveAttribute('aria-invalid', 'true');
        expect(within(emailStep).getByText('Add an email body.')).toHaveClass('text-destructive');
    });

    it('spins the modal button while publishing changes to an active automation', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });

        renderEditor();

        await stageLocalEdit();
        fireEvent.click(screen.getByRole('button', {name: 'Publish changes'}));

        let dialog = screen.getByRole('alertdialog', {name: 'Update your automation?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Publish changes'}));

        dialog = screen.getByRole('alertdialog', {name: 'Update your automation?'});
        const button = within(dialog).getByRole('button', {name: 'Publishing...'});
        expect(button).toBeDisabled();
        expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows a retry state and error in the modal when re-publishing fails', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [automationDetail]},
            isLoading: false,
            isError: false
        });
        mockEditMutation.mutate.mockImplementation((_payload, options) => {
            options.onError?.();
        });

        renderEditor();

        await stageLocalEdit();
        fireEvent.click(screen.getByRole('button', {name: 'Publish changes'}));

        const dialog = screen.getByRole('alertdialog', {name: 'Update your automation?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Publish changes'}));

        const button = within(dialog).getByRole('button', {name: 'Retry'});
        expect(button).not.toBeDisabled();
        expect(button).toHaveClass('bg-destructive');
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

    it('clears the failed publish state when the confirmation modal is dismissed', async () => {
        mockUseReadAutomation.mockReturnValue({
            data: {automations: [{...automationDetail, status: 'inactive'}]},
            isLoading: false,
            isError: false
        });
        mockEditMutation.mutate.mockImplementation((_payload, options) => {
            options.onError?.();
        });

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Publish'}));
        const dialog = await screen.findByRole('alertdialog', {name: 'Start your automation?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Publish'}));

        // After the failure, the modal button is the destructive Retry.
        expect(within(dialog).getByRole('button', {name: 'Retry'})).toHaveClass('bg-destructive');

        // Dismissing the modal clears the failure; the toolbar button returns to plain Publish.
        fireEvent.click(within(dialog).getByRole('button', {name: 'Cancel'}));
        await waitFor(() => {
            expect(screen.queryByRole('alertdialog', {name: 'Start your automation?'})).not.toBeInTheDocument();
        });

        const recoveredButton = screen.getByRole('button', {name: 'Publish'});
        expect(recoveredButton).toBeEnabled();
        expect(recoveredButton).not.toHaveClass('bg-destructive');
    });
});
