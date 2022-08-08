import React, {useContext} from 'react';
import {ReactMobileDocContext} from 'react-mobiledoc-editor';

export default function MarkupButton({editor, tag}) {
    const {activeMarkupTags} = useContext(ReactMobileDocContext);

    const [isActive, setIsActive] = React.useState(false);
    
    const handleClick = () => {
        editor.toggleMarkup(tag);
    };

    React.useEffect(() => {
        if (activeMarkupTags?.includes(tag)) {
            setIsActive(true);
        } else {
            setIsActive(false);
        }
    }, [activeMarkupTags]);

    return (
        <button className={isActive ? 'font-bold' : ''} onClick={handleClick}>{tag}</button>
    );
}
