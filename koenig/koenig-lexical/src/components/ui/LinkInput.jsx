import PropTypes from 'prop-types';
import React, {useEffect, useRef} from 'react';
import {ReactComponent as CloseIcon} from '../../assets/icons/kg-close.svg';

export function LinkInput({href, update, cancel, arrowStyles}) {
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
        <div ref={containerRef} className="relative m-0 flex h-[36px] min-w-[240px] items-center justify-evenly rounded bg-black py-0 font-sans text-sm font-medium">
            <input
                ref={inputRef}
                className="mb-[1px] h-auto w-full rounded bg-black pl-3 pr-9 leading-loose text-white selection:bg-grey/40"
                data-testid="link-input"
                placeholder="Enter url"
                value={_href}
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

            {
                !!_href && (
                    <button aria-label="Close" className="absolute right-3 cursor-pointer" type="button" onClick={(e) => {
                        e.stopPropagation();
                        setHref('');
                        inputRef.current.focus();
                    }}>
                        <CloseIcon className="h-3 w-3 stroke-2 text-grey" />
                    </button>
                )
            }

            {/* Arrow block. Used div instead of pseudo-element. Arrow requires dynamic values for position,
             and Tailwind can't handle this. They recommended CSS-in-JS or style attr for such cases (https://v2.tailwindcss.com/docs/just-in-time-mode) */}
            <div
                className="absolute top-[36px] left-[calc(50%-8px)] w-0 border-x-8 border-t-8 border-x-transparent border-t-black"
                style={arrowStyles}
            ></div>
        </div>
    );
}

LinkInput.propTypes = {
    href: PropTypes.string
};
