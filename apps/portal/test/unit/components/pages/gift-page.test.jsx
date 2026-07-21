import {fireEvent, render} from '../../../utils/test-utils';
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

    test('collapses long descriptions behind a Show more toggle', () => {
        const longDescription = `<p>${'Give the gift of quality journalism. '.repeat(10).trim()}</p>`;
        const {container, getByRole, queryByRole} = renderGiftPage({
            gift_page_description: longDescription
        });

        const subtitle = container.querySelector('.gh-portal-gift-checkout-subtitle');
        expect(subtitle.className).toContain('gh-portal-gift-checkout-subtitle-clamped');

        const toggle = getByRole('button', {name: 'Show more'});
        fireEvent.click(toggle);

        expect(subtitle.className).not.toContain('gh-portal-gift-checkout-subtitle-clamped');
        expect(getByRole('button', {name: 'Show less'})).toBeInTheDocument();

        fireEvent.click(getByRole('button', {name: 'Show less'}));
        expect(subtitle.className).toContain('gh-portal-gift-checkout-subtitle-clamped');
        expect(queryByRole('button', {name: 'Show more'})).toBeInTheDocument();
    });

    test('short descriptions render without a Show more toggle', () => {
        const {queryByRole, container} = renderGiftPage({
            gift_page_description: '<p>Short and sweet pitch.</p>'
        });

        expect(queryByRole('button', {name: 'Show more'})).not.toBeInTheDocument();
        expect(container.querySelector('.gh-portal-gift-checkout-subtitle-clamped')).toBeNull();
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
