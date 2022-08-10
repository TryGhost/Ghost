import {useContext} from 'react';
import AppContext from '../AppContext';

const CTABox = (props) => {
    const {accentColor, publication, member} = useContext(AppContext);

    const buttonStyle = {
        backgroundColor: accentColor
    };

    const linkStyle = {
        color: accentColor
    };

    const titleText = (props.isFirst ? 'Start the conversation' : 'Join the discussion');

    const handleSignUpClick = (event) => {
        window.location.href = (props.isPaid && member) ? '#/portal/account/plans' : '#/portal/signup';
    };

    const handleSignInClick = (event) => {
        window.location.href = '#/portal/signin';
    };

    return (
        <section className={`flex flex-col items-center pt-[40px] ${member ? 'pb-[32px]' : 'pb-[48px]'} px-8 border-t-2 border-gray-100 dark:border-gray-100/10 border-b-2`}>
            <h1 className={`mb-[8px] text-center text-black text-[24px] font-sans tracking-tight dark:text-[rgba(255,255,255,0.85)] ${props.isFirst ? 'font-semibold' : 'font-bold'}`}>
                {titleText}
            </h1>
            <p className="mb-[28px] px-0 sm:px-8 max-w-screen-sm font-sans text-[16px] text-center leading-normal text-neutral-600 dark:text-[rgba(255,255,255,0.85)]">
                Become a {props.isPaid && 'paid'} member of <span className="font-semibold">{publication}</span> to start commenting.
            </p>
            <button onClick={handleSignUpClick} className="mb-[12px] text-white font-san py-[14px] px-5 rounded inline-block font-medium leading-none hover:opacity-90 transition-all" style={buttonStyle}>
                {(props.isPaid && member) ? 'Upgrade now' : 'Sign up now'}
            </button>
            {!member && (<p className="text-sm font-sans text-center text-neutral-400 dark:text-[rgba(255,255,255,0.5)]">
                <span className='inline-block mr-1 text-[15px]'>Already a member?</span>
                <button onClick={handleSignInClick} className="rounded-md hover:opacity-90 transition-all text-sm font-semibold" style={linkStyle}>Sign in</button>
            </p>)}
        </section>
    );
};

export default CTABox;
