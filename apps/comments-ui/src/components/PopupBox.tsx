import GenericPopup from './popups/GenericPopup';
import {Pages} from '../pages';
import {useAppContext} from '../AppContext';
import {useEffect, useState} from 'react';

type Props = {};
const PopupBox: React.FC<Props> = () => {
    const {popup} = useAppContext();

    // To make sure we can properly animate a popup that goes away, we keep a state of the last visible popup
    // This way, when the popup context is set to null, we still can show the popup while we transition it away
    const [lastPopup, setLastPopup] = useState(popup);

    useEffect(() => {
        if (popup !== null) {
            setLastPopup(popup);
        }

        if (popup === null) {
            // Remove lastPopup from memory after 250ms (leave transition has ended + 50ms safety margin)
            // If, during those 250ms, the popup is reassigned, the timer will get cleared first.
            // This fixes an issue in HeadlessUI where the <Transition show={show}> component is not removed from DOM when show is set to true and false very fast.
            const timer = setTimeout(() => {
                setLastPopup(null);
            }, 250);

            return () => {
                clearTimeout(timer);
            };
        }
    }, [popup, setLastPopup]);

    if (!lastPopup || !lastPopup.type) {
        return null;
    }

    const {type, ...popupProps} = popup ?? lastPopup;
    const PageComponent = Pages[type];

    if (!PageComponent) {
        // eslint-disable-next-line no-console
        console.warn('Unknown popup of type ', type);
        return null;
    }

    const show = popup === lastPopup;

    return (
        <>
            <GenericPopup callback={popupProps.callback} show={show} title={type}>
                <PageComponent {...popupProps as any}/>
            </GenericPopup>
        </>
    );
};

export default PopupBox;
