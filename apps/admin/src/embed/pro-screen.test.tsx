import {act, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ProScreen from './pro-screen';

const {mockCrossShellNavigate, mockRefetchQueries, mockUseBrowseConfig, mockUseCurrentUser} = vi.hoisted(() => ({
    mockCrossShellNavigate: vi.fn(),
    mockRefetchQueries: vi.fn().mockResolvedValue(undefined),
    mockUseBrowseConfig: vi.fn(),
    mockUseCurrentUser: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    useQueryClient: () => ({refetchQueries: mockRefetchQueries})
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
    useBrowseConfig: mockUseBrowseConfig
}));

vi.mock('@tryghost/admin-x-framework/api/current-user', () => ({
    useCurrentUser: mockUseCurrentUser
}));

vi.mock('@tryghost/admin-x-framework/api/users', () => ({
    isOwnerUser: (user: {roles: Array<{name: string}>}) => user.roles.some(role => role.name === 'Owner')
}));

vi.mock('@/utils/cross-shell-navigate', () => ({
    crossShellNavigate: mockCrossShellNavigate
}));

const BILLING_URL = 'http://billing.example.com';

function mockConfig({billingUrl = BILLING_URL, forceUpgrade = false}: {billingUrl?: string | undefined; forceUpgrade?: boolean} = {}) {
    mockUseBrowseConfig.mockReturnValue({
        data: {config: {hostSettings: {forceUpgrade, billing: {url: billingUrl}}}}
    });
}

function mockUser(roleName: string) {
    mockUseCurrentUser.mockReturnValue({
        data: {id: '1', name: 'Test User', email: 'test@example.com', roles: [{name: roleName}]}
    });
}

describe('ProScreen', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hash = '#/pro';
        mockConfig();
        mockUser('Owner');
    });

    it('renders the billing iframe for the owner', () => {
        render(<ProScreen />);

        expect(screen.getByTestId('billing-frame')).toHaveAttribute('src', BILLING_URL);
        expect(mockCrossShellNavigate).not.toHaveBeenCalled();
    });

    it('appends the hash child route to the iframe src', () => {
        window.location.hash = '#/pro/billing';

        render(<ProScreen />);

        expect(screen.getByTestId('billing-frame')).toHaveAttribute('src', `${BILLING_URL}/billing`);
    });

    it('redirects non-owner users home when not in force upgrade', () => {
        mockUser('Administrator');

        const {container} = render(<ProScreen />);

        expect(mockCrossShellNavigate).toHaveBeenCalledWith('/', {replace: true});
        expect(container).toBeEmptyDOMElement();
    });

    it('keeps the screen reachable for non-owners in force upgrade mode', () => {
        mockUser('Administrator');
        mockConfig({forceUpgrade: true});

        render(<ProScreen />);

        expect(screen.getByTestId('billing-frame')).toBeInTheDocument();
        expect(mockCrossShellNavigate).not.toHaveBeenCalled();
    });

    it('redirects home when no billing url is configured (self-hosted)', () => {
        mockUseBrowseConfig.mockReturnValue({
            data: {config: {hostSettings: {forceUpgrade: false}}}
        });

        render(<ProScreen />);

        expect(mockCrossShellNavigate).toHaveBeenCalledWith('/', {replace: true});
    });

    it('renders nothing while config and user are loading', () => {
        mockUseBrowseConfig.mockReturnValue({data: undefined});
        mockUseCurrentUser.mockReturnValue({data: undefined});

        const {container} = render(<ProScreen />);

        expect(container).toBeEmptyDOMElement();
        expect(mockCrossShellNavigate).not.toHaveBeenCalled();
    });

    describe('postMessage protocol', () => {
        function dispatchBillingMessage(iframe: HTMLIFrameElement, data: unknown) {
            act(() => {
                window.dispatchEvent(new MessageEvent('message', {
                    data,
                    origin: 'http://billing.example.com',
                    source: iframe.contentWindow
                }));
            });
        }

        it('answers token requests with the identity token', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({identities: [{token: 'identity-token'}]})
            });
            vi.stubGlobal('fetch', fetchMock);

            render(<ProScreen />);

            const iframe = screen.getByTestId<HTMLIFrameElement>('billing-frame');
            const postMessageSpy = vi.spyOn(iframe.contentWindow!, 'postMessage');

            dispatchBillingMessage(iframe, {request: 'token'});

            await waitFor(() => {
                expect(postMessageSpy).toHaveBeenCalledWith(
                    {request: 'token', response: 'identity-token'},
                    'http://billing.example.com'
                );
            });
            expect(fetchMock).toHaveBeenCalledWith('/ghost/api/admin/identities/', {credentials: 'include'});

            vi.unstubAllGlobals();
        });

        it('answers token requests from non-owners with a null token without hitting the API', async () => {
            mockUser('Administrator');
            mockConfig({forceUpgrade: true});
            const fetchMock = vi.fn();
            vi.stubGlobal('fetch', fetchMock);

            render(<ProScreen />);

            const iframe = screen.getByTestId<HTMLIFrameElement>('billing-frame');
            const postMessageSpy = vi.spyOn(iframe.contentWindow!, 'postMessage');

            dispatchBillingMessage(iframe, {request: 'token'});

            await waitFor(() => {
                expect(postMessageSpy).toHaveBeenCalledWith(
                    {request: 'token', response: null},
                    'http://billing.example.com'
                );
            });
            expect(fetchMock).not.toHaveBeenCalled();

            vi.unstubAllGlobals();
        });

        it('answers forceUpgradeInfo requests with the upgrade state and owner info', () => {
            mockConfig({forceUpgrade: true});

            render(<ProScreen />);

            const iframe = screen.getByTestId<HTMLIFrameElement>('billing-frame');
            const postMessageSpy = vi.spyOn(iframe.contentWindow!, 'postMessage');

            dispatchBillingMessage(iframe, {request: 'forceUpgradeInfo'});

            expect(postMessageSpy).toHaveBeenCalledWith({
                request: 'forceUpgradeInfo',
                response: {
                    forceUpgrade: true,
                    isOwner: true,
                    ownerUser: {name: 'Test User', email: 'test@example.com'}
                }
            }, 'http://billing.example.com');
        });

        it('ignores messages from other origins', () => {
            render(<ProScreen />);

            const iframe = screen.getByTestId<HTMLIFrameElement>('billing-frame');
            const postMessageSpy = vi.spyOn(iframe.contentWindow!, 'postMessage');

            window.dispatchEvent(new MessageEvent('message', {
                data: {request: 'forceUpgradeInfo'},
                origin: 'http://evil.example.com',
                source: iframe.contentWindow
            }));

            expect(postMessageSpy).not.toHaveBeenCalled();
        });

        it('syncs the billing route into the admin hash and hides loading once ready', () => {
            render(<ProScreen />);

            expect(screen.getByTestId('billing-loading')).toBeInTheDocument();

            const iframe = screen.getByTestId<HTMLIFrameElement>('billing-frame');
            dispatchBillingMessage(iframe, {request: 'billingAppReady', route: '/billing'});

            expect(window.location.hash).toBe('#/pro/billing');
            expect(screen.queryByTestId('billing-loading')).not.toBeInTheDocument();
        });

        it('refetches config and settings on subscription updates', () => {
            render(<ProScreen />);

            const iframe = screen.getByTestId<HTMLIFrameElement>('billing-frame');
            dispatchBillingMessage(iframe, {subscription: {status: 'active'}});

            expect(mockRefetchQueries).toHaveBeenCalledWith({queryKey: ['ConfigResponseType']});
            expect(mockRefetchQueries).toHaveBeenCalledWith({queryKey: ['SettingsResponseType']});
        });
    });
});
