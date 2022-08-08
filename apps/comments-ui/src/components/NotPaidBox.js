import {useContext} from 'react';
import AppContext from '../AppContext';

const NotPaidBox = (props) => {
    const {accentColor, publication} = useContext(AppContext);

    const buttonStyle = {
        backgroundColor: accentColor
    };

    const titleText = (props.isFirst ? 'Start the conversation' : 'Want to join the discussion?');

    const handleSubscribeClick = (event) => {
        window.location.href = '#/portal/signup';
    };

    return (
        <section className={`flex flex-col items-center pt-12 pb-10 px-8 border-t-2 border-gray-100 dark:border-gray-100/10 border-b-2`}>
            <h1 className="mb-2 text-center text-black text-[24px] font-sans tracking-tight dark:text-[rgba(255,255,255,0.85)] font-bold">
                {titleText}
            </h1>
            <p className="mb-4 font-sans leading-normal text-[16px] text-neutral-500 dark:text-[rgba(255,255,255,0.85)]">
                Become a {props.isPaid && 'paid'} member of <span className="font-medium text-neutral-700">{publication}</span> to start commenting.
            </p>
            <button onClick={handleSubscribeClick} className="mt-1 text-white font-sans py-3 px-5 mb-4 rounded inline-block font-medium leading-none hover:opacity-90 transition-all" style={buttonStyle}>
                Choose a plan
            </button>
        </section>
    );
};

export default NotPaidBox;
