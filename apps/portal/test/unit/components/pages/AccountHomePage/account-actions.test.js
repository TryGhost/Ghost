import {act, render, waitFor} from '../../../../utils/test-utils';
import AccountActions from '../../../../../src/components/pages/AccountHomePage/components/account-actions';
import {getSiteData, getMemberData} from '../../../../../src/utils/fixtures-generator';

async function waitForFetchAndFlush() {
    await waitFor(() => {
        expect(window.fetch).toHaveBeenCalled();
    });
    await act(async () => {});
}

describe('AccountActions', () => {
    describe('Transistor integration', () => {
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

            await waitForFetchAndFlush();
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

            await waitForFetchAndFlush();
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
            await waitForFetchAndFlush();

            expect(queryByText('Podcasts')).not.toBeInTheDocument();
        });

        test('does not show Podcasts when API returns invalid JSON', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => {
                    throw new SyntaxError('Unexpected token');
                }
            });

            const {queryByText} = render(<AccountActions />, {
                overrideContext: {site, member}
            });

            await waitForFetchAndFlush();
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
                    `https://partner.transistor.fm/ghost/member/${member.uuid}`,
                    expect.objectContaining({signal: expect.any(AbortSignal)})
                );
            });
        });
    });
});
