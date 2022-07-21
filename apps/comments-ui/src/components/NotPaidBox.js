import {useContext} from 'react';
import AppContext from '../AppContext';

const NotPaidBox = (props) => {
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

    return (
        <section className="text-center mb-1 bg-neutral-900 rounded-lg pt-12 pb-10 px-8" style={boxStyle}>
            <h1 className="text-center text-white text-[28px] font-sans font-semibold mb-6 tracking-tight">{titleText}</h1>
            <button onClick={handleSubscribeClick} className="bg-white font-sans py-3 px-4 mb-6 rounded inline-block font-medium" style={buttonStyle}>
                Subscribe now
            </button>
            <p className="font-sans text-center text-white">
                You need to be subscribed to a paid plan to be able to join the discussion.
            </p>
        </section>
    );
};

export default NotPaidBox;
