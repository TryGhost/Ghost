import reactStringReplace from 'react-string-replace';
import {buildCommentPermalink} from '../../utils/helpers';
import {useAppContext} from '../../app-context';

type Props = {
    isFirst: boolean,
    isPaid: boolean,
    // When the CTA was opened by clicking "Reply" on a comment, this is that
    // comment's id — used to return the reader to it after signing in.
    commentId?: string
};
const CTABox: React.FC<Props> = ({isFirst, isPaid, commentId}) => {
    const {accentColor, publication, member, t, commentCount} = useAppContext();

    const buttonStyle = {
        backgroundColor: accentColor
    };

    const linkStyle = {
        color: accentColor
    };

    const titleText = (commentCount === 0 ? t('Start the conversation') : t('Join the discussion'));

    const handleSignUpClick = () => {
        window.location.href = (isPaid && member) ? '#/portal/account/plans' : '#/portal/signup';
    };

    const handleSignInClick = () => {
        // Ask Portal to return the reader to this comment after signing in. The
        // redirect must be absolute (it is emailed as part of the magic link),
        // so it is built from the live page URL at click time.
        if (commentId) {
            const redirect = new URL(window.location.href);
            redirect.hash = buildCommentPermalink(commentId);
            window.location.href = `#/portal/signin?redirect=${encodeURIComponent(redirect.toString())}`;
            return;
        }
        window.location.href = '#/portal/signin';
    };

    const text = reactStringReplace(isPaid ? t('Become a paid member of {publication} to start commenting.') : t('Become a member of {publication} to start commenting.'), '{publication}', () => (
        <span className="font-semibold">{publication}</span>
    ));

    return (
        <>
            <h1 className={`mb-[8px] text-center font-sans text-2xl tracking-tight  text-black dark:text-[rgba(255,255,255,0.85)] ${isFirst ? 'font-semibold' : 'font-bold'}`}>
                {titleText}
            </h1>
            <p className="sm:max-w-screen-sm mb-[28px] w-full px-0 text-center font-sans text-lg leading-normal text-neutral-600 dark:text-[rgba(255,255,255,0.85)] sm:px-8">
                {text}
            </p>
            <button className="mb-[12px] inline-block rounded px-5 py-[14px] font-sans text-md font-medium leading-none text-white transition-all hover:opacity-90" data-testid="signup-button" style={buttonStyle} type="button" onClick={handleSignUpClick}>
                {(isPaid && member) ? t('Upgrade now') : t('Sign up now')}
            </button>
            {!member && (<p className="text-center font-sans text-md text-[rgba(0,0,0,0.4)] dark:text-[rgba(255,255,255,0.5)]">
                <span className='mr-1 inline-block text-[15px]'>{t('Already a member?')}</span>
                <button className="rounded-md text-sm font-semibold transition-all hover:opacity-90" data-testid="signin-button" style={linkStyle} type="button" onClick={handleSignInClick}>{t('Sign in')}</button>
            </p>)}
        </>
    );
};

export default CTABox;
