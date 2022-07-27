import {useContext} from 'react';
import AppContext from '../AppContext';

const NotPaidBox = (props) => {
    const {accentColor} = useContext(AppContext);

    const buttonStyle = {
        backgroundColor: accentColor
    };

    const titleText = (props.isFirst ? 'Want to be the first to comment?' : 'Want to join the discussion?');

    const handleSubscribeClick = (event) => {
        window.location.href = '#/portal/signup';
    };

    return (
        <section className="text-center mb-1 pt-12 pb-10 px-8 border-t border-[#f1f1f1]">
            <h1 className="text-center text-black text-[22px] font-sans font-semibold mb-4 tracking-tight dark:text-white">{titleText}</h1>
            <button onClick={handleSubscribeClick} className="text-white font-sans py-3 px-4 mb-6 rounded inline-block font-medium" style={buttonStyle}>
                Subscribe now
            </button>
            <p className="font-sans text-center text-neutral-500 dark:text-[rgba(255,255,255,0.5)]">
                You need to be subscribed to a paid plan to be able to join the discussion.
            </p>
        </section>
    );
};

export default NotPaidBox;
