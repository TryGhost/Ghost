import { fireEvent, render } from '../../utils/test-utils';
import { PopupContent } from '../../../src/components/popup-modal';
import { getPriceData, getProductData, getSiteData } from '../../../src/utils/fixtures-generator';

const renderPopup = (overrideContext) =>
  render(<PopupContent isMobile={false} />, { overrideContext });

/** Portal's popup at the gift flow's delivery step, which holds a textarea and a date picker. */
const renderGiftDelivery = () => {
  const product = getProductData({
    id: 'tier_123',
    name: 'Premium',
    monthlyPrice: getPriceData({ amount: 500, interval: 'month' }),
    yearlyPrice: getPriceData({ amount: 5000, interval: 'year' }),
  });
  const site = getSiteData({
    products: [product],
    portalProducts: [product.id],
  });
  const utils = renderPopup({
    page: 'gift',
    site,
    member: {
      email: 'buyer@example.com',
      status: 'free',
    },
  });
  fireEvent.change(utils.getByLabelText('Your name'), { target: { value: 'Jamie' } });
  fireEvent.click(utils.getByRole('button', { name: 'Continue to delivery details' }));
  return utils;
};

describe('PopupContent', () => {
  test('closes on Escape', () => {
    const { mockDoActionFn } = renderPopup({ page: 'signup' });

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(mockDoActionFn).toHaveBeenCalledWith('closePopup');
  });

  test('stays open on an Escape something in it has already handled', () => {
    const { getByRole, mockDoActionFn } = renderPopup({ page: 'signup' });
    const handlesEscape = getByRole('button', { name: 'Close popup' });
    handlesEscape.addEventListener('keydown', (event) => event.preventDefault());

    fireEvent.keyDown(handlesEscape, { key: 'Escape' });

    expect(mockDoActionFn).not.toHaveBeenCalledWith('closePopup');
  });

  test('stays open on an Escape that cancels what an input method is composing', () => {
    const { mockDoActionFn } = renderPopup({ page: 'signup' });

    fireEvent.keyDown(document.body, { key: 'Escape', isComposing: true });

    expect(mockDoActionFn).not.toHaveBeenCalledWith('closePopup');
  });

  test('only closes on Escape when the focused textarea is empty', () => {
    const { getByLabelText, mockDoActionFn } = renderGiftDelivery();
    const message = getByLabelText('Optional message');
    fireEvent.change(message, { target: { value: 'Enjoy!' } });
    fireEvent.keyDown(message, { key: 'Escape' });

    expect(mockDoActionFn).not.toHaveBeenCalledWith('closePopup');

    fireEvent.change(message, { target: { value: '' } });
    fireEvent.keyDown(message, { key: 'Escape' });

    expect(mockDoActionFn).toHaveBeenCalledWith('closePopup');
  });

  test('stays open on the Escape that closes the date picker', () => {
    const { getByTestId, queryByTestId, mockDoActionFn } = renderGiftDelivery();
    fireEvent.click(getByTestId('datepicker-toggle'));

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(queryByTestId('datepicker-popover')).not.toBeInTheDocument();
    expect(mockDoActionFn).not.toHaveBeenCalledWith('closePopup');
  });

  test("stays open on the Escape that closes the share page's menu", () => {
    const { getByRole, queryByRole, mockDoActionFn } = renderPopup({ page: 'share' });
    fireEvent.click(getByRole('button', { name: 'More options' }));

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(queryByRole('menu')).not.toBeInTheDocument();
    expect(mockDoActionFn).not.toHaveBeenCalledWith('closePopup');
  });
});
