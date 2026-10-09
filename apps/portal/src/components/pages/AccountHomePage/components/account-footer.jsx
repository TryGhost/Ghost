import { t } from '../../../../utils/i18n';

const AccountFooter = ({ handleSignout, supportAddress = '' }) => {
  const supportAddressMail = `mailto:${supportAddress}`;
  return (
    <footer className="gh-portal-account-footer flex max-[391px]:p-0! max-[341px]:flex-wrap max-[341px]:gap-3">
      <ul className="gh-portal-account-footermenu m-0 flex list-none items-center p-0 [&_li]:me-4 [&_li:last-of-type]:me-0">
        <li>
          <button
            data-test-button="footer-signout"
            className="gh-portal-btn relative flex h-11 min-w-[80px] cursor-pointer items-center justify-center rounded-md border border-solid border-gray-200 bg-white px-[1.8rem] py-0 text-center text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-black no-underline outline-none select-none transition-control hover:border-gray-300 disabled:cursor-auto disabled:opacity-50! max-[1441px]:h-[42px]"
            name="logout"
            aria-label="logout"
            onClick={(e) => handleSignout(e)}
          >
            {t('Sign out')}
          </button>
        </li>
      </ul>
      <div className="gh-portal-account-footerright flex grow items-center justify-end max-[341px]:justify-start">
        <ul className="gh-portal-account-footermenu m-0 flex list-none items-center p-0 [&_li]:me-4 [&_li:last-of-type]:me-0">
          <li>
            <a
              data-test-link="footer-support"
              className="gh-portal-btn gh-portal-btn-branded relative flex h-11 min-w-[80px] cursor-pointer items-center justify-center rounded-md border border-solid border-gray-200 bg-white px-[1.8rem] py-0 text-center text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-brand no-underline outline-none select-none transition-control hover:border-gray-300"
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
