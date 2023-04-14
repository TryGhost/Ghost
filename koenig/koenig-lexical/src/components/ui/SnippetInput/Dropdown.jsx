import React from 'react';

export const Dropdown = ({snippets, onCreateSnippet, value, isCreateButtonActive, onKeyDown, activeMenuItem}) => {
    const buttonRef = React.useRef(null);

    React.useEffect(() => {
        if (isCreateButtonActive) {
            buttonRef.current?.focus();
        } else {
            buttonRef.current?.blur();
        }
    }, [isCreateButtonActive]);

    return (
        <ul
            className="absolute mt-[-1px] w-full max-w-[240px] rounded-b border border-grey-200 bg-white py-1 shadow"
            tabIndex={0}
            onKeyDown={onKeyDown}
        >
            <li className="mb-2 block px-4 pt-3">
                <button
                    ref={buttonRef}
                    className="cursor-pointer focus:bg-green-400"
                    type="button"
                    onClick={onCreateSnippet}
                >Create &quot;{value}&ldquo;</button>
            </li>

            {!!snippets.length && (
                <DropdownSection
                    activeMenuItem={activeMenuItem}
                    list={snippets}
                    onClick={onCreateSnippet}
                />
            )}
        </ul>
    );
};

const DropdownSection = ({list = [], onClick, activeMenuItem}) => {
    return (
        <li role="separator">
            <span className="mb-2 block px-4 pt-3 uppercase text-grey">Replace existing</span>
            <ul role="menu">
                {
                    list.map((item, index) => (
                        <DropdownItem key={item.name} active={activeMenuItem} index={index} onClick={onClick}>
                            {item.name}
                        </DropdownItem>
                    ))
                }
            </ul>
        </li>
    );
};

const DropdownItem = ({onClick, children, active, index}) => {
    const buttonRef = React.useRef(null);

    React.useEffect(() => {
        const isFocused = active === index;
        if (isFocused) {
            buttonRef.current?.focus();
        } else {
            buttonRef.current?.blur();
        }
    }, [active, index]);

    return (
        <li>
            <button
                ref={buttonRef}
                className="cursor-pointer py-2 px-4 focus:bg-green-400"
                type="button"
                onClick={onClick}
            >
                {children}
            </button>
        </li>
    );
};
