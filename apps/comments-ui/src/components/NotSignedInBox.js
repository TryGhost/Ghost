import {useContext} from 'react';
import AppContext from '../AppContext';

const NotSignedInBox = (props) => {
    const {accentColor} = useContext(AppContext);

    const boxStyle = {
        background: accentColor
    };

    const buttonStyle = {
        color: accentColor
    };

    const titleText = (props.isFirst ? 'Want to be the first to comment?' : 'Want to join the discussion?');

    const handleSubscribeClick = (event) => {
        window.location.href = '#/portal/signup';
    };

    const handleSignInClick = (event) => {
        window.location.href = '#/portal/signin';
    };

    return (
        <section className="text-center mb-1 bg-neutral-900 rounded-lg pt-12 pb-10 px-8" style={boxStyle}>
            <h1 className="text-center text-white text-[28px] font-sans font-semibold mb-6 tracking-tight">{titleText}</h1>
            <button onClick={handleSubscribeClick} className="bg-white font-sans py-3 px-4 mb-6 rounded inline-block font-medium" style={buttonStyle}>
                Subscribe now
            </button>
            <p className="font-sans text-center text-white">
                <span className='inline-block mr-1'>Already have an account?</span>
                <button onClick={handleSignInClick} className="text-white underline">Sign in</button>
            </p>
        </section>
    );
};

export default NotSignedInBox;
