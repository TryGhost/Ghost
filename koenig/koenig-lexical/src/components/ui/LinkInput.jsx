import React, {useEffect, useRef} from 'react';

export function LinkInput({href, update, cancel}) {
    const [_href, setHref] = React.useState(href);

    // add refs for input and container
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // update the href when the prop changes
    React.useEffect(() => {
        setHref(href);
    }, [href]);

    // when link is open, focus the input
    useEffect(() => {
        inputRef.current.focus();
    }, []);

    // when link is open, watch the window for mousedown events so that we can
    // close it when we detect a click outside
    const closeOnClickOutside = React.useCallback((event) => {
        if (containerRef.current && !containerRef.current.contains(event.target)) {
            cancel();
        }
    }, [cancel]);

    React.useEffect(() => {
        window.addEventListener('mousedown', closeOnClickOutside);
        return () => {
            window.removeEventListener('mousedown', closeOnClickOutside);
        };
    }, [closeOnClickOutside]);

    // when link is open, watch the window for escape keydown events so that we can exit
    const onEscape = React.useCallback((event) => {
        if (event.key === 'Escape') {
            cancel();
        }
    }, [cancel]);

    React.useEffect(() => {
        window.addEventListener('keydown', onEscape);
        return () => {
            window.removeEventListener('keydown', onEscape);
        };
    }, [onEscape]);

    return (
        <div className="text-md after:border-t-green relative m-0 flex items-center justify-evenly rounded bg-transparent px-1 py-0 font-sans font-normal text-white after:absolute after:top-[36px] after:left-[calc(50%-8px)] after:w-0 after:border-x-8 after:border-t-8 after:border-x-transparent" ref={containerRef}>
            <input
                ref={inputRef}
                placeholder="Enter url"
                value={_href}
                className="kg-link-input h-10 rounded-md bg-white px-2 text-black"
                style={{height: '36px'}}
                onInput={(e) => {
                    setHref(e.target.value);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        // prevent Enter from triggering in the editor and removing text
                        e.preventDefault();
                        update(_href);
                        return;
                    }
                }}
            />
            <button aria-label="Close" class="kg-input-bar-close" type="button" onClick={(e) => {
                e.stopPropagation();
                setHref('');
                inputRef.current.focus();
            }}>
                x
            </button>
        </div>
    );
}