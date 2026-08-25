import { fireEvent, render } from '../../utils/test-utils';
import { PopupContent } from '../../../src/components/popup-modal';
import { getPriceData, getProductData, getSiteData } from '../../../src/utils/fixtures-generator';

describe('PopupContent', () => {
  test('only closes on Escape when the focused textarea is empty', () => {
    const product = getProductData({
      id: 'tier_123',
      name: 'Premium',
      monthlyPrice: getPriceData({ amount: 500, interval: 'month' }),
      yearlyPrice: getPriceData({ amount: 5000, interval: 'year' }),
    });
    const site = getSiteData({
      labs: { giftSubCustomization: true },
      products: [product],
      portalProducts: [product.id],
    });
    const { getByLabelText, getByRole, mockDoActionFn } = render(
      <PopupContent isMobile={false} />,
      {
        overrideContext: {
          page: 'gift',
          site,
          member: {
            email: 'buyer@example.com',
            status: 'free',
          },
        },
      },
    );

    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    const message = getByLabelText('Optional message');
    fireEvent.change(message, { target: { value: 'Enjoy!' } });
    fireEvent.keyUp(message, { key: 'Escape' });

    expect(mockDoActionFn).not.toHaveBeenCalledWith('closePopup');

    fireEvent.change(message, { target: { value: '' } });
    fireEvent.keyUp(message, { key: 'Escape' });

    expect(mockDoActionFn).toHaveBeenCalledWith('closePopup');
  });
});
