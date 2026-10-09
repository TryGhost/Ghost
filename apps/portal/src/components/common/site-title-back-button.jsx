import React from 'react';
import AppContext from '../../app-context';
import clsx from 'clsx';
import { t } from '../../utils/i18n';
import { tw } from '../../utils/tw';

const PLACEMENTS = {
  signup: tw`relative max-lg:hidden`,
  gift: tw`absolute top-8 left-8 max-md:top-3 max-md:left-6 max-md:h-10 rtl:right-8 rtl:left-auto rtl:max-md:right-6`,
};

export default class SiteTitleBackButton extends React.Component {
  static contextType = AppContext;

  render() {
    const { placement = 'signup' } = this.props;
    return (
      <>
        <button
          className={clsx(
            'group/back z-[10000] flex h-auto min-w-20 cursor-pointer items-center justify-center rounded-md border-0 border-none bg-white p-0 text-center text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-gray-950 no-underline outline-none select-none [transition:transform_0.25s_ease-in-out] disabled:cursor-auto disabled:opacity-50!',
            PLACEMENTS[placement],
          )}
          onClick={() => {
            if (this.props.onBack) {
              this.props.onBack();
            } else {
              this.context.doAction('closePopup');
            }
          }}
        >
          <span className="me-1 [transition:translate_0.4s_cubic-bezier(0.1,0.7,0.1,1)] group-hover/back:translate-x-[-3px] rtl:-scale-x-100 rtl:group-hover/back:translate-x-0">
            &larr;{' '}
          </span>{' '}
          {t('Back')}
        </button>
      </>
    );
  }
}
