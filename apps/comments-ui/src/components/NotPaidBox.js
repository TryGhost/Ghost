import {useContext} from 'react';
import AppContext from '../AppContext';

const NotPaidBox = (props) => {
    const {accentColor} = useContext(AppContext);

    const buttonStyle = {
        backgroundColor: accentColor
    };

    const titleText = (props.isFirst ? 'Be first to start the conversation' : 'Want to join the discussion?');

    const handleSubscribeClick = (event) => {
        window.location.href = '#/portal/signup';
    };

    return (
        <section className={`flex flex-col items-center mb-1 pt-12 pb-12 px-8 border-t-2 border-gray-100 dark:border-gray-100/10 ` + (props.isFirst && ` border-b-2`)}>
            <h1 className={`text-center text-black text-[22px] font-sans mb-4 tracking-tight dark:text-[rgba(255,255,255,0.85)]` + (props.isFirst ? `font-semibold` : `font-bold`)}>{titleText}</h1>
            <button onClick={handleSubscribeClick} className="text-white font-sans py-3 px-5 mb-4 rounded inline-block font-medium leading-none hover:opacity-90 transition-all" style={buttonStyle}>
                Choose a plan
            </button>
            <p className="text-sm font-sans text-center text-neutral-400 dark:text-[rgba(255,255,255,0.5)] max-w-xs">
                You need to be subscribed to a paid plan to be able to join the discussion.
            </p>
        </section>
    );
};

export default NotPaidBox;
