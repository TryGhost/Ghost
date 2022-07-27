import {useContext} from 'react';
import AppContext from '../AppContext';

const NotSignedInBox = (props) => {
    const {accentColor} = useContext(AppContext);

    const buttonStyle = {
        backgroundColor: accentColor
    };

    const linkStyle = {
        color: accentColor
    };

    const firstComment = (props.isFirst ? {borderTop: '0px', paddingTop: '0'} : {});

    const titleText = (props.isFirst ? 'Want to be the first to comment?' : 'Want to join the discussion?');

    const handleSubscribeClick = (event) => {
        window.location.href = '#/portal/signup';
    };

    const handleSignInClick = (event) => {
        window.location.href = '#/portal/signin';
    };

    return (
        <section className="text-center mb-1 pt-12 pb-10 px-8 border-t border-[#f1f1f1]" style={firstComment}>
            <h1 className="text-center text-black text-[22px] font-sans font-semibold mb-4 tracking-tight dark:text-white">{titleText}</h1>
            <button onClick={handleSubscribeClick} className="text-white font-sans py-3 px-4 mb-6 rounded inline-block font-medium" style={buttonStyle}>
                Subscribe now
            </button>
            <p className="font-sans text-center text-neutral-500 dark:text-[rgba(255,255,255,0.5)]">
                <span className='inline-block mr-1'>Already have an account?</span>
                <button onClick={handleSignInClick} clasName="rounded-md" style={linkStyle}>Sign in</button>
            </p>
        </section>
    );
};

export default NotSignedInBox;
