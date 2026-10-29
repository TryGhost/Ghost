import { render } from '../../../utils/test-utils';
import GiftCard, { getGiftCardTextureUrls } from '../../../../src/components/common/gift-card';

describe('getGiftCardTextureUrls', () => {
  test('builds the texture URLs from the site URL, with or without a trailing slash', () => {
    const expected = [
      'https://example.com/gift/assets/gift-card-orb.webp',
      'https://example.com/gift/assets/gift-card-noise.webp',
    ];

    expect(getGiftCardTextureUrls('https://example.com/')).toEqual(expected);
    expect(getGiftCardTextureUrls('https://example.com')).toEqual(expected);
  });

  test('keeps the subdirectory of a subdirectory install', () => {
    expect(getGiftCardTextureUrls('https://example.com/blog/')).toEqual([
      'https://example.com/blog/gift/assets/gift-card-orb.webp',
      'https://example.com/blog/gift/assets/gift-card-noise.webp',
    ]);
  });

  test('returns no URLs when the site URL is missing', () => {
    expect(getGiftCardTextureUrls(undefined)).toEqual([]);
  });
});

describe('GiftCard', () => {
  const getCard = (container) => container.querySelector('.gh-portal-gift-checkout-card');

  test('points the card textures at the site', () => {
    const { container } = render(<GiftCard siteTitle="The Blueprint" />, {
      overrideContext: { site: { url: 'https://example.com/blog/' } },
    });

    const card = getCard(container);
    expect(card.style.getPropertyValue('--gh-gift-orb')).toBe(
      'url("https://example.com/blog/gift/assets/gift-card-orb.webp")',
    );
    expect(card.style.getPropertyValue('--gh-gift-noise')).toBe(
      'url("https://example.com/blog/gift/assets/gift-card-noise.webp")',
    );
  });

  test('renders without textures when the site URL is missing', () => {
    const { container, getByText } = render(<GiftCard siteTitle="The Blueprint" />, {
      overrideContext: { site: {} },
    });

    expect(getByText('The Blueprint')).toBeInTheDocument();
    expect(getCard(container).hasAttribute('style')).toBe(false);
  });
});
