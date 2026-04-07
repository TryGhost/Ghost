// TODO: Add translation strings once copy has been finalise

const GIFT_REDEMPTION_ERROR_TITLE = 'Gift could not be redeemed';
const INVALID_GIFT_LINK_MESSAGE = 'Gift link is not valid';

export function getGiftRedemptionErrorMessage(error) {
    const subtitle = error?.message && error.message !== 'Failed to load gift data'
        ? error.message
        : INVALID_GIFT_LINK_MESSAGE;

    return {
        title: GIFT_REDEMPTION_ERROR_TITLE,
        subtitle
    };
}
