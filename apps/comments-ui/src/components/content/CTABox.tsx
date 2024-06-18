import reactStringReplace from 'react-string-replace';
import {useAppContext} from '../../AppContext';

type Props = {
    isFirst: boolean,
    isPaid: boolean
};
const CTABox: React.FC<Props> = ({isFirst, isPaid}) => {
    const {accentColor, commentCount, publication, member, t} = useAppContext();

    const buttonStyle = {
        backgroundColor: accentColor
    };

    const linkStyle = {
        color: accentColor
    };

    const titleText = (isFirst ? t('Start the conversation') : t('Join the discussion'));

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
        <section className={`flex flex-col items-center pt-[40px] ${member ? 'pb-[32px]' : 'pb-[48px]'} ${!isFirst && 'mt-4'} ${!member && commentCount ? 'border-t' : 'border-none'} border-[rgba(0,0,0,0.075)] sm:px-8 dark:border-[rgba(255,255,255,0.1)]`} data-testid="cta-box">
            <h1 className={`mb-[8px] text-center font-sans text-[24px] tracking-tight  text-black dark:text-[rgba(255,255,255,0.85)] ${isFirst ? 'font-semibold' : 'font-bold'}`}>
                {titleText}
            </h1>
            <p className="mb-[28px] w-full px-0 text-center font-sans text-[16px] leading-normal text-neutral-600 sm:max-w-screen-sm sm:px-8 dark:text-[rgba(255,255,255,0.85)]">
                {text}
            </p>
            <button className="font-san mb-[12px] inline-block rounded px-5 py-[14px] font-medium leading-none text-white transition-all hover:opacity-90" data-testid="signup-button" style={buttonStyle} type="button" onClick={handleSignUpClick}>
                {(isPaid && member) ? t('Upgrade now') : t('Sign up now')}
            </button>
            {!member && (<p className="text-center font-sans text-sm text-[rgba(0,0,0,0.4)] dark:text-[rgba(255,255,255,0.5)]">
                <span className='mr-1 inline-block text-[15px]'>{t('Already a member?')}</span>
                <button className="rounded-md text-sm font-semibold transition-all hover:opacity-90" data-testid="signin-button" style={linkStyle} type="button" onClick={handleSignInClick}>{t('Sign in')}</button>
            </p>)}
        </section>
    );
};

export default CTABox;
