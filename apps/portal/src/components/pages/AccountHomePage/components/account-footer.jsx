import { t } from '../../../../utils/i18n';

const AccountFooter = ({ handleSignout, supportAddress = '' }) => {
  const supportAddressMail = `mailto:${supportAddress}`;
  return (
    <footer className="gh-portal-account-footer flex max-[390px]:!p-0 max-[340px]:flex-wrap max-[340px]:gap-3">
      <ul className="gh-portal-account-footermenu m-0 flex list-none items-center p-0 [&_li:last-of-type]:me-0 [&_li]:me-4">
        <li>
          <button
            data-test-button="footer-signout"
            className="gh-portal-btn relative flex h-11 min-w-[80px] cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md border border-solid border-gray-200 bg-white px-[1.8rem] py-0 text-center text-base font-medium leading-[1em] tracking-[0.2px] text-black no-underline [outline:none] [transition:all_.25s_ease] hover:border-gray-300 disabled:cursor-auto disabled:!opacity-50 max-[1440px]:h-[42px]"
            name="logout"
            aria-label="logout"
            onClick={(e) => handleSignout(e)}
          >
            {t('Sign out')}
          </button>
        </li>
      </ul>
      <div className="gh-portal-account-footerright flex grow items-center justify-end max-[340px]:justify-start">
        <ul className="gh-portal-account-footermenu m-0 flex list-none items-center p-0 [&_li:last-of-type]:me-0 [&_li]:me-4">
          <li>
            <a
              data-test-link="footer-support"
              className="gh-portal-btn gh-portal-btn-branded relative flex h-11 min-w-[80px] cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md border border-solid border-gray-200 bg-white px-[1.8rem] py-0 text-center text-base font-medium leading-[1em] tracking-[0.2px] text-brand no-underline [outline:none] [transition:all_.25s_ease] hover:border-gray-300"
              href={supportAddressMail}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('Contact support')}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
};

export default AccountFooter;
