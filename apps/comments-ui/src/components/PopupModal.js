import {useContext, useEffect, useState} from 'react';
import AppContext from '../AppContext';
import Pages from '../pages';
import GenericDialog from './modals/GenericDialog';

export default function PopupModal(props) {
    const {popup} = useContext(AppContext);

    // To make sure we can properly animate a popup that goes away, we keep a state of the last visible popup
    // This way, when the popup context is set to null, we still can show the popup while we transition it away
    const [lastPopup, setLastPopup] = useState(popup);

    useEffect(() => {
        if (popup !== null) {
            setLastPopup(popup);
        }
    }, [popup, setLastPopup]);

    if (!lastPopup || !lastPopup.type) {
        return null;
    }

    const {type, ...popupProps} = lastPopup;
    const PageComponent = Pages[type];

    if (!PageComponent) {
        // eslint-disable-next-line no-console
        console.warn('Unknown popup of type ', type);
        return null;
    }

    const show = popup === lastPopup;

    return (
        <GenericDialog show={show}>
            <PageComponent {...popupProps}/>
        </GenericDialog>
    );
}
