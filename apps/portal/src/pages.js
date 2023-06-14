import SigninPage from './components/pages/SigninPage';
import SignupPage from './components/pages/SignupPage';
import AccountHomePage from './components/pages/AccountHomePage/AccountHomePage';
import MagicLinkPage from './components/pages/MagicLinkPage';
import LoadingPage from './components/pages/LoadingPage';
import AccountPlanPage from './components/pages/AccountPlanPage';
import AccountProfilePage from './components/pages/AccountProfilePage';
import AccountEmailPage from './components/pages/AccountEmailPage';
import OfferPage from './components/pages/OfferPage';
import NewsletterSelectionPage from './components/pages/NewsletterSelectionPage';
import UnsubscribePage from './components/pages/UnsubscribePage';
import FeedbackPage from './components/pages/FeedbackPage';
import EmailSuppressedPage from './components/pages/EmailSuppressedPage';
import EmailSuppressionFAQ from './components/pages/EmailSuppressionFAQ';
import EmailReceivingFAQ from './components/pages/EmailReceivingFAQ';

/** List of all available pages in Portal, mapped to their UI component
 * Any new page added to portal needs to be mapped here
*/
const Pages = {
    signin: SigninPage,
    signup: SignupPage,
    accountHome: AccountHomePage,
    accountPlan: AccountPlanPage,
    accountProfile: AccountProfilePage,
    accountEmail: AccountEmailPage,
    signupNewsletter: NewsletterSelectionPage,
    unsubscribe: UnsubscribePage,
    magiclink: MagicLinkPage,
    loading: LoadingPage,
    offer: OfferPage,
    feedback: FeedbackPage,
    emailSuppressed: EmailSuppressedPage,
    emailSuppressionFAQ: EmailSuppressionFAQ,
    emailReceivingFAQ: EmailReceivingFAQ
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

export const isOfferPage = function ({page}) {
    return page.includes('offer');
};

export default Pages;
