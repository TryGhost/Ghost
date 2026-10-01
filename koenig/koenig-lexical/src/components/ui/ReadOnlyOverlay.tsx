import CardContext from '../../context/CardContext';
import {useContext} from 'react';

export function ReadOnlyOverlay() {
    const {readOnly} = useContext(CardContext);
    // The overlay selects cards in an editable editor. Previews should allow
    // the content underneath to be selected and its links to be followed.
    if (readOnly) {
        return null;
    }

    return <div className="absolute top-0 z-10 !m-0 size-full cursor-default p-0"></div>;
}
