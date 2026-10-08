import React from 'react';
import AppContext from '../../app-context';
import GhostLogo from '../../images/ghost-logo-small.svg?react';

export default class PoweredBy extends React.Component {
  static contextType = AppContext;

  render() {
    // Note: please do not wrap "Powered by Ghost" in the translation function, as we don't
    // want it to be translated
    /* eslint-disable i18next/no-literal-string */
    return (
      <a
        href="https://ghost.org"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-7 w-[146px] items-center rounded border-none bg-[#ffffff] py-1.5 pl-[7px] pr-2 text-[1.25rem] font-medium leading-[28px] tracking-[-0.2px] text-[#303336] no-underline [transition:color_0.5s_ease-in-out] hover:text-[#15171A] rtl:pl-2 rtl:pr-[7px]"
      >
        <GhostLogo className="m-0 me-1.5 size-4" />
        Powered by Ghost
      </a>
    );
    /* eslint-enable i18next/no-literal-string */
  }
}
