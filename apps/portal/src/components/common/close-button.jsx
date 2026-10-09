import React from 'react';
import AppContext from '../../app-context';
import clsx from 'clsx';
import CloseIcon from '../../images/icons/close.svg?react';
import { tw } from '../../utils/tw';

// Light icons sit on the gift layout's brand-coloured panel; on gift checkout it moves to a white header on narrow screens
const TONES = {
  default: tw`text-gray-700 hover:text-gray-800`,
  light: tw`text-white/65 hover:text-white/90`,
  lightOnWide: tw`text-white/65 hover:text-white/90 max-md:text-brand max-md:hover:text-brand`,
};

const PLACEMENTS = {
  popup: tw`fixed top-6 right-6 group-[.full-size]/popup:top-5 group-[.full-size]/popup:right-5 rtl:right-auto rtl:left-6 rtl:group-[.full-size]/popup:right-auto rtl:group-[.full-size]/popup:left-5`,
  // Inside the gift layout's content panel; the checkout also docks it in the mobile header
  gift: tw`absolute top-8 right-8 rtl:right-auto rtl:left-5`,
  giftCheckout: tw`absolute top-8 right-8 max-md:top-3 max-md:right-3 max-md:flex max-md:h-10 max-md:items-center rtl:right-auto rtl:left-5 rtl:max-md:left-3`,
  longform: tw`fixed top-6 right-[calc(6vmin-20px)] max-sm:right-6 rtl:right-auto rtl:left-6`,
  share: tw`fixed top-5 right-6 rtl:right-auto rtl:left-6`,
};

export default class CloseButton extends React.Component {
  static contextType = AppContext;

  closePopup = () => {
    this.context.doAction('closePopup');
  };

  render() {
    const {
      brandColor,
      onClick,
      placement = 'popup',
      hideOnMobile = false,
      tone = 'default',
    } = this.props;
    const closeIconColor = tone === 'default' ? brandColor || this.context.brandColor : null;

    return (
      <button
        type="button"
        className={clsx(
          'z-[10000] border-none bg-transparent p-0',
          PLACEMENTS[placement],
          hideOnMobile && 'max-sm:hidden',
        )}
        aria-label="Close popup"
        data-testid="close-popup"
        data-test-button="close-popup"
        onClick={onClick || this.closePopup}
      >
        <CloseIcon
          className={clsx(
            'gh-portal-closeicon size-5 cursor-pointer p-3 [transition:all_0.2s_ease-in-out] group-[.full-size]/popup:size-6 max-sm:group-[.full-size]/popup:size-4',
            TONES[tone],
          )}
          style={closeIconColor ? { color: closeIconColor } : undefined}
          aria-hidden="true"
        />
      </button>
    );
  }
}
