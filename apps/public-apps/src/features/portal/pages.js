import SigninPage from './components/pages/signin-page';
import SignupPage from './components/pages/signup-page';
import AccountHomePage from './components/pages/AccountHomePage/account-home-page';
import MagicLinkPage from './components/pages/magic-link-page';
import LoadingPage from './components/pages/loading-page';
import AccountPlanPage from './components/pages/account-plan-page';
import AccountProfilePage from './components/pages/account-profile-page';
import AccountEmailPage from './components/pages/account-email-page';
import OfferPage from './components/pages/offer-page';
import NewsletterSelectionPage from './components/pages/newsletter-selection-page';
import UnsubscribePage from './components/pages/unsubscribe-page';
import FeedbackPage from './components/pages/feedback-page';
import EmailSuppressedPage from './components/pages/email-suppressed-page';
import EmailSuppressionFAQ from './components/pages/email-suppression-faq';
import EmailReceivingFAQ from './components/pages/email-receiving-faq';
import SupportPage from './components/pages/support-page';
import SupportSuccess from './components/pages/support-success';
import SupportError from './components/pages/support-error';
import RecommendationsPage from './components/pages/recommendations-page';

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
    emailReceivingFAQ: EmailReceivingFAQ,
    support: SupportPage,
    supportSuccess: SupportSuccess,
    supportError: SupportError,
    recommendations: RecommendationsPage
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

export const isSupportPage = function ({page}) {
    return page.includes('support');
};

export default Pages;
