import {render, waitFor} from '../../../../utils/test-utils';
import TransistorPodcastsAction from '../../../../../src/components/pages/AccountHomePage/components/transistor-podcasts-action';
import AccountActions from '../../../../../src/components/pages/AccountHomePage/components/account-actions';
import {getSiteData, getMemberData} from '../../../../../src/utils/fixtures-generator';

describe('TransistorPodcastsAction', () => {
    describe('Presentational component', () => {
        const setup = ({hasPodcasts, memberUuid} = {}) => {
            const {mockDoActionFn, ...utils} = render(
                <TransistorPodcastsAction hasPodcasts={hasPodcasts} memberUuid={memberUuid} />,
                {
                    overrideContext: {}
                }
            );
            return {mockDoActionFn, ...utils};
        };

        test('renders nothing when hasPodcasts is false', () => {
            const {queryByText} = setup({hasPodcasts: false, memberUuid: 'test-uuid'});
            expect(queryByText('Podcasts')).not.toBeInTheDocument();
            expect(queryByText('Subscribe')).not.toBeInTheDocument();
        });

        test('renders nothing when memberUuid is missing', () => {
            const {queryByText} = setup({hasPodcasts: true, memberUuid: null});
            expect(queryByText('Podcasts')).not.toBeInTheDocument();
        });

        test('renders Podcasts section with Subscribe link when hasPodcasts is true', () => {
            const {queryByText} = setup({hasPodcasts: true, memberUuid: 'test-uuid-123'});
            expect(queryByText('Podcasts')).toBeInTheDocument();
            expect(queryByText('Subscribe')).toBeInTheDocument();
        });

        test('Subscribe link points to correct Transistor URL', () => {
            const {getByText} = setup({hasPodcasts: true, memberUuid: 'test-uuid-123'});
            const link = getByText('Subscribe');
            expect(link.getAttribute('href')).toBe('https://partner.transistor.fm/ghost/test-uuid-123');
        });

        test('Subscribe link opens in new tab', () => {
            const {getByText} = setup({hasPodcasts: true, memberUuid: 'test-uuid-123'});
            const link = getByText('Subscribe');
            expect(link.getAttribute('target')).toBe('_blank');
            expect(link.getAttribute('rel')).toBe('noopener noreferrer');
        });
    });

    describe('Integrated with AccountActions', () => {
        const site = {...getSiteData(), labs: {transistor: true}};
        const member = getMemberData({
            name: 'Test User',
            email: 'test@example.com',
            paid: false,
            subscriptions: []
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        test('shows Podcasts when transistor lab is enabled and API returns member: true', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({member: true, shows: ['show-1']})
            });

            const {queryByText} = render(<AccountActions />, {
                overrideContext: {site, member}
            });

            await waitFor(() => {
                expect(queryByText('Podcasts')).toBeInTheDocument();
                expect(queryByText('Subscribe')).toBeInTheDocument();
            });
        });

        test('does not show Podcasts when API returns member: false', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({member: false, shows: []})
            });

            const {queryByText} = render(<AccountActions />, {
                overrideContext: {site, member}
            });

            await waitFor(() => {
                expect(window.fetch).toHaveBeenCalled();
            });

            expect(queryByText('Podcasts')).not.toBeInTheDocument();
        });

        test('does not show Podcasts when transistor lab is disabled', () => {
            const siteWithoutTransistor = {...getSiteData(), labs: {}};

            vi.spyOn(window, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({member: true, shows: ['show-1']})
            });

            const {queryByText} = render(<AccountActions />, {
                overrideContext: {site: siteWithoutTransistor, member}
            });

            expect(queryByText('Podcasts')).not.toBeInTheDocument();
            expect(window.fetch).not.toHaveBeenCalled();
        });

        test('does not show Podcasts when API call fails', async () => {
            vi.spyOn(window, 'fetch').mockRejectedValue(new Error('Network error'));

            const {queryByText} = render(<AccountActions />, {
                overrideContext: {site, member}
            });

            await waitFor(() => {
                expect(window.fetch).toHaveBeenCalled();
            });

            expect(queryByText('Podcasts')).not.toBeInTheDocument();
        });

        test('does not show Podcasts when API returns non-ok response', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValue({
                ok: false,
                status: 500
            });

            const {queryByText} = render(<AccountActions />, {
                overrideContext: {site, member}
            });

            await waitFor(() => {
                expect(window.fetch).toHaveBeenCalled();
            });

            expect(queryByText('Podcasts')).not.toBeInTheDocument();
        });

        test('calls Transistor API with correct member UUID', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({member: true, shows: []})
            });

            render(<AccountActions />, {
                overrideContext: {site, member}
            });

            await waitFor(() => {
                expect(window.fetch).toHaveBeenCalledWith(
                    `https://partner.transistor.fm/ghost/member/${member.uuid}`
                );
            });
        });
    });
});
