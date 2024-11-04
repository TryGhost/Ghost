import reactStringReplace from 'react-string-replace';
import {useAppContext} from '../../AppContext';

type Props = {
    isFirst: boolean,
    isPaid: boolean
};
const CTABox: React.FC<Props> = ({isFirst, isPaid}) => {
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
        window.location.href = '#/portal/signin';
    };

    const text = reactStringReplace(isPaid ? t('Become a paid member of {{publication}} to start commenting.') : t('Become a member of {{publication}} to start commenting.'), '{{publication}}', () => (
        <span className="font-semibold">{publication}</span>
    ));

    return (
        <>
            <h1 className={`mb-[8px] text-center font-sans text-2xl tracking-tight  text-black dark:text-[rgba(255,255,255,0.85)] ${isFirst ? 'font-semibold' : 'font-bold'}`}>
                {titleText}
            </h1>
            <p className="mb-[28px] w-full px-0 text-center font-sans text-lg leading-normal text-neutral-600 sm:max-w-screen-sm sm:px-8 dark:text-[rgba(255,255,255,0.85)]">
                {text}
            </p>
            <button className="text-md mb-[12px] inline-block rounded px-5 py-[14px] font-sans font-medium leading-none text-white transition-all hover:opacity-90" data-testid="signup-button" style={buttonStyle} type="button" onClick={handleSignUpClick}>
                {(isPaid && member) ? t('Upgrade now') : t('Sign up now')}
            </button>
            {!member && (<p className="text-md text-center font-sans text-[rgba(0,0,0,0.4)] dark:text-[rgba(255,255,255,0.5)]">
                <span className='mr-1 inline-block text-[15px]'>{t('Already a member?')}</span>
                <button className="rounded-md text-sm font-semibold transition-all hover:opacity-90" data-testid="signin-button" style={linkStyle} type="button" onClick={handleSignInClick}>{t('Sign in')}</button>
            </p>)}
        </>
    );
};

export default CTABox;
