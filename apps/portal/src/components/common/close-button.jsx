import React from 'react';
import AppContext from '../../app-context';
import CloseIcon from '../../images/icons/close.svg?react';

export default class CloseButton extends React.Component {
  static contextType = AppContext;

  closePopup = () => {
    this.context.doAction('closePopup');
  };

  render() {
    const { brandColor, onClick } = this.props;
    const closeIconColor = brandColor || this.context.brandColor;

    return (
      <button
        type="button"
        className="gh-portal-closeicon-container fixed top-6 right-6 z-[10000] border-none bg-transparent p-0 group-[.full-size]/popup:top-5 group-[.full-size]/popup:right-5 rtl:right-auto rtl:left-6 rtl:group-[.full-size]/popup:right-auto rtl:group-[.full-size]/popup:left-5"
        aria-label="Close popup"
        data-testid="close-popup"
        data-test-button="close-popup"
        onClick={onClick || this.closePopup}
      >
        <CloseIcon
          className="gh-portal-closeicon size-5 cursor-pointer p-3 text-gray-700 [transition:all_0.2s_ease-in-out] group-[.full-size]/popup:size-6 group-[.full-size.gift]/popup:text-white/65! group-[.full-size.giftRedemption]/popup:text-white/65! group-[.full-size.giftSuccess]/popup:text-white/65! hover:text-gray-800 group-[.full-size.gift]/popup:hover:text-white/90! group-[.full-size.giftRedemption]/popup:hover:text-white/90! group-[.full-size.giftSuccess]/popup:hover:text-white/90! max-[881px]:group-[.full-size.gift]/popup:text-brand! max-[881px]:group-[.full-size.gift]/popup:hover:text-brand! max-sm:group-[.full-size]/popup:size-4"
          style={closeIconColor ? { color: closeIconColor } : undefined}
          aria-hidden="true"
        />
      </button>
    );
  }
}
