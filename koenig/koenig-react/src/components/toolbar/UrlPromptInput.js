import React from 'react';
import {UI} from 'mobiledoc-kit';

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
    const handleUrlSubmit = (e) => {
        e.preventDefault();
        let editor = props.editor;
        editor.selectRange(props.cachedRange);
        UI.toggleLink(editor, prompt);
        setUrl('');
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

    return (
        <div 
            style={urlPromptPositionStyles}
            className="absolute"
            ref={ref}>
            <form
                onSubmit={handleUrlSubmit}
                className="relative flex">
                <input ref={formRef} onChange={handleUrlInput} name="url" type="url" placeholder="Enter url" value={url} />
                <button hidden={true} type="submit"></button>
                <div onClick={closeUrlPrompt} className='absolute right-0 cursor-pointer'>X</div>
            </form>
        </div>
    );
});

export default UrlPromptInput;
