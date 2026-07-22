import {fireEvent, render} from '../../../utils/test-utils';
import GiftSuccessPage from '../../../../src/components/pages/gift-success-page';
import {testSite} from '../../../../src/utils/fixtures';

const renderGiftSuccessPage = (pageData = {}) => {
    return render(<GiftSuccessPage />, {
        overrideContext: {
            site: {
                ...testSite,
                url: 'https://example.com/'
            },
            pageData: {
                token: 'gift-token-123',
                ...pageData
            }
        }
    });
};

describe('GiftSuccessPage', () => {
    test('link mode: leads with the shareable link and the inbox-copy footer', () => {
        const {getByText, queryByText} = renderGiftSuccessPage({delivery: 'link'});

        // The redeem link is the hero, with a plain "share it" subtitle
        expect(getByText('https://example.com/gift/gift-token-123')).toBeInTheDocument();
        expect(getByText(/share the link below whenever the moment feels right/i)).toBeInTheDocument();
        // No emailed-mode confirmation or demoted share label
        expect(queryByText(/emailed it to the recipient/i)).not.toBeInTheDocument();
        expect(queryByText('Share it yourself')).not.toBeInTheDocument();
        // Footer nudging the buyer that a copy is in their inbox
        expect(getByText(/emailed a copy to your inbox/i)).toBeInTheDocument();
    });

    test('emailed mode: confirms delivery and demotes the link to a secondary action', () => {
        const {getByText, queryByText} = renderGiftSuccessPage({delivery: 'sent'});

        expect(getByText('Your gift is on its way')).toBeInTheDocument();
        expect(getByText(/We've emailed it to the recipient/i)).toBeInTheDocument();
        // Link is still available but demoted under a secondary label
        expect(getByText('Share it yourself')).toBeInTheDocument();
        expect(getByText('https://example.com/gift/gift-token-123')).toBeInTheDocument();
        // The link-mode footer is not shown (subtitle already covers the inbox copy)
        expect(queryByText(/Not ready to share/i)).not.toBeInTheDocument();
    });

    test('scheduled mode: shows the scheduled date in the confirmation', () => {
        const {getByText} = renderGiftSuccessPage({
            delivery: 'scheduled',
            deliveryDate: '2030-12-24'
        });

        expect(getByText('Your gift is scheduled')).toBeInTheDocument();
        // Date format is locale/timezone dependent, so just assert the
        // scheduled-delivery sentence renders with the year interpolated in
        expect(getByText(/We'll email it to the recipient on .*2030.* a copy is in your inbox too\./)).toBeInTheDocument();
        expect(getByText('Share it yourself')).toBeInTheDocument();
    });

    test('copies the redeem link to the clipboard', async () => {
        const writeText = vi.fn().mockResolvedValue();
        Object.assign(navigator, {clipboard: {writeText}});

        const {getByRole} = renderGiftSuccessPage({delivery: 'link'});
        fireEvent.click(getByRole('button', {name: /copy/i}));

        expect(writeText).toHaveBeenCalledWith('https://example.com/gift/gift-token-123');
    });
});
