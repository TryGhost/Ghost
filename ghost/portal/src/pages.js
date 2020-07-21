import SigninPage from './components/pages/SigninPage';
import SignupPage from './components/pages/SignupPage';
import AccountHomePage from './components/pages/AccountHomePage';
import MagicLinkPage from './components/pages/MagicLinkPage';
import LoadingPage from './components/pages/LoadingPage';
import AccountPlanPage from './components/pages/AccountPlanPage';
import AccountProfilePage from './components/pages/AccountProfilePage';
import LinkPage from './components/pages/LinkPage';

/** List of all available pages in Portal, mapped to their UI component
 * Any new page added to portal needs to be mapped here
*/
const Pages = {
    signin: SigninPage,
    signup: SignupPage,
    accountHome: AccountHomePage,
    accountPlan: AccountPlanPage,
    accountProfile: AccountProfilePage,
    magiclink: MagicLinkPage,
    loading: LoadingPage,
    links: LinkPage
};

/** Return page if valid, fallback to signup */
export const getActivePage = function ({page}) {
    if (Object.keys(Pages).includes(page)) {
        return page;
    }
    return 'signup';
};

export const isAccountPage = function ({page}) {
    return page.includes('account');
};

export default Pages;