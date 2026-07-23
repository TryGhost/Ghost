import {render} from '../../../utils/test-utils';
import GiftPage from '../../../../src/components/pages/gift-page';
import {testSite} from '../../../../src/utils/fixtures';

const renderGiftPage = (siteOverrides = {}) => {
    return render(<GiftPage />, {
        overrideContext: {
            site: {
                ...testSite,
                url: 'https://example.com/',
                ...siteOverrides
            },
            member: null
        }
    });
};

describe('GiftPage', () => {
    test('renders default heading and description when no customization is set', () => {
        const {getByRole, getByText} = renderGiftPage();

        expect(getByRole('heading', {level: 1, name: 'Gift a membership'})).toBeInTheDocument();
        expect(getByText(/Share a full membership to/)).toBeInTheDocument();
    });

    test('renders custom heading, description and image when set', () => {
        const {getByRole, getByText, queryByText, container} = renderGiftPage({
            gift_page_heading: 'Give the gift of great journalism',
            gift_page_description: '<p>Our members get <strong>everything</strong> we publish.</p>',
            gift_page_image: 'https://example.com/content/images/gift-promo.jpg'
        });

        expect(getByRole('heading', {level: 1, name: 'Give the gift of great journalism'})).toBeInTheDocument();
        expect(getByText(/Our members get/)).toBeInTheDocument();
        expect(queryByText(/Share a full membership to/)).not.toBeInTheDocument();

        const promoImage = container.querySelector('.gh-portal-gift-checkout-promo-image');
        expect(promoImage).toBeInTheDocument();
        expect(promoImage).toHaveAttribute('src', 'https://example.com/content/images/gift-promo.jpg');
    });

    test('sanitizes custom description HTML', () => {
        const {container, getByText} = renderGiftPage({
            gift_page_description: '<p>Safe text</p><script>window.hacked = true;</script><img src="x" onerror="window.hacked = true;" />'
        });

        expect(getByText('Safe text')).toBeInTheDocument();
        expect(container.querySelector('.gh-portal-gift-checkout-subtitle script')).toBeNull();
        expect(container.querySelector('.gh-portal-gift-checkout-subtitle img')).toBeNull();
    });

    test('renders the full description with no Show more toggle', () => {
        // The gift page no longer collapses long descriptions — the admin caps
        // the input at 350 chars so it always fits, and it renders in full.
        const longDescription = `<p>${'Give the gift of quality journalism. '.repeat(9).trim()}</p>`;
        const {container, queryByRole} = renderGiftPage({
            gift_page_description: longDescription
        });

        const subtitle = container.querySelector('.gh-portal-gift-checkout-subtitle');
        expect(subtitle.className).not.toContain('gh-portal-gift-checkout-subtitle-clamped');
        expect(queryByRole('button', {name: 'Show more'})).not.toBeInTheDocument();
        expect(queryByRole('button', {name: 'Show less'})).not.toBeInTheDocument();
        expect(subtitle.textContent).toContain('Give the gift of quality journalism.');
    });

    test('falls back to defaults for whitespace-only customization', () => {
        const {getByRole, getByText} = renderGiftPage({
            gift_page_heading: '   ',
            gift_page_description: '  '
        });

        expect(getByRole('heading', {level: 1, name: 'Gift a membership'})).toBeInTheDocument();
        expect(getByText(/Share a full membership to/)).toBeInTheDocument();
    });
});
