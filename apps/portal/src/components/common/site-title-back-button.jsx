import React from 'react';
import AppContext from '../../app-context';
import { t } from '../../utils/i18n';

export default class SiteTitleBackButton extends React.Component {
  static contextType = AppContext;

  render() {
    return (
      <>
        <button
          className="gh-portal-btn gh-portal-btn-site-title-back group/back relative z-[10000] flex h-11 min-w-[80px] cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md border border-solid border-gray-200 bg-white px-[1.8rem] py-0 text-center text-base font-medium leading-[1em] tracking-[0.2px] text-black no-underline [outline:none] [transition:transform_0.25s_ease-in-out] hover:border-gray-300 disabled:cursor-auto disabled:!opacity-50 max-[960px]:hidden"
          onClick={() => {
            if (this.props.onBack) {
              this.props.onBack();
            } else {
              this.context.doAction('closePopup');
            }
          }}
        >
          <span className="me-1 [transition:transform_0.4s_cubic-bezier(0.1,0.7,0.1,1)] group-hover/back:translate-x-[-3px] rtl:-scale-x-100 rtl:group-hover/back:translate-x-0">
            &larr;{' '}
          </span>{' '}
          {t('Back')}
        </button>
      </>
    );
  }
}
