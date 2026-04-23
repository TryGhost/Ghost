import {getSiteData, getNewslettersData, getMemberData} from '../../../../src/utils/fixtures-generator';
import {render, waitFor} from '../../../utils/test-utils';
import UnsubscribePage from '../../../../src/components/pages/unsubscribe-page';

const mockApi = {
    member: {
        newsletters: vi.fn(),
        updateNewsletters: vi.fn()
    }
};

const setup = (overrides) => {
    const {mockDoActionFn, context, ...utils} = render(
        <UnsubscribePage />,
        {
            overrideContext: {
                api: mockApi,
                pageData: {
                    uuid: 'test-uuid',
                    key: 'test-key'
                },
                ...overrides
            }
        }
    );

    return {
        mockDoActionFn,
        context,
        ...utils
    };
};

describe('Unsubscribe Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('paid subscription message is shown for paid members', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData,
            title: 'Test Site'
        });
        const paidMember = getMemberData({newsletters: newsletterData, paid: true});
        
        mockApi.member.newsletters.mockResolvedValue(paidMember);

        const {getByText} = setup({site: siteData});

        await waitFor(() => {
            expect(getByText(`Unsubscribing from emails will not cancel your paid subscription to ${siteData.title}`)).toBeInTheDocument();
        });
    });

    test('paid subscription message is not shown for free members', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData,
            title: 'Test Site'
        });
        const freeMember = getMemberData({newsletters: newsletterData, paid: false});
        
        mockApi.member.newsletters.mockResolvedValue(freeMember);

        const {queryByText} = setup({site: siteData});

        await waitFor(() => {
            expect(mockApi.member.newsletters).toHaveBeenCalled();
        });

        expect(queryByText(`Unsubscribing from emails will not cancel your paid subscription to ${siteData.title}`)).not.toBeInTheDocument();
    });

    test('handles invalid uuid gracefully', async () => {
        const siteData = getSiteData({
            title: 'Test Site'
        });
        
        mockApi.member.newsletters.mockResolvedValue(null);

        const {getByText} = setup({site: siteData});

        await waitFor(() => {
            expect(getByText('That didn\'t go to plan')).toBeInTheDocument();
        });
    });
});
