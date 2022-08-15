import React from 'react';
import {UI} from 'mobiledoc-kit';
import {getLinkMarkupFromRange} from './utils/markup-utils';
import DeleteIcon from './icons/delete.svg';

const UrlPromptInput = React.forwardRef((props, ref) => {
    const [url, setUrl] = React.useState('');
    const formRef = React.useRef();

    const prompt = (message, defaultUrl, promptCallback) => {
        promptCallback(url);
    };

    const urlPromptPositionStyles = {
        top: `${props.toolbarPosition.top}px`,
        left: `${props.toolbarPosition.left}px`,
        zIndex: `${props.showUrlPrompt.showUrlPrompt ? '1999' : '-999'}`,
        pointerEvents: `${props.showUrlPrompt.showUrlPrompt ? 'auto !important' : 'none !important'}`,
        opacity: `${props.showUrlPrompt.showUrlPrompt ? '1' : '0'}`
    };
    
    const handleUrlSubmit = async (e) => {
        e.preventDefault();
        let editor = props.editor;
        await editor.selectRange(props.cachedRange);
        UI.toggleLink(editor, prompt);
        setUrl('');
        props.showUrlPrompt.setShowUrlPrompt(false);
        editor.selectRange(props.selectedRange);
    };

    const handleUrlInput = (e) => {
        setUrl(e.target.value);
    };
    
    const closeUrlPrompt = () => {
        props.showUrlPrompt.setShowUrlPrompt(false);
    };

    React.useEffect(() => {
        if (props.showUrlPrompt.showUrlPrompt) {
            formRef.current.focus();
        }
    }, [props, ref]);

    React.useEffect(() => {
        if (props?.cachedRange) {
            let linkMarkup = getLinkMarkupFromRange(props.cachedRange);
            setUrl(linkMarkup?.attributes?.href);
        }
    }, [props.cachedRange]);

    return (
        <div 
            style={urlPromptPositionStyles}
            className="absolute"
            ref={ref}>
            <form
                onSubmit={handleUrlSubmit}
                className="relative flex">
                <input className='min-h-full rounded border border-green p-2 pr-7 font-sans text-sm font-medium text-grey-dark shadow-lg placeholder:font-medium' ref={formRef} onChange={handleUrlInput} name="url" placeholder="Enter url" value={url || ''} />
                <button hidden={true} type="submit"></button>
                <DeleteIcon onClick={closeUrlPrompt} className='absolute right-2 top-3 cursor-pointer' />
            </form>
        </div>
    );
});

export default UrlPromptInput;
