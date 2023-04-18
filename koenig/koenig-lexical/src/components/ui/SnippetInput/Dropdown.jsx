import React from 'react';
import {ReactComponent as PlusIcon} from '../../../assets/icons/plus.svg';
import {ReactComponent as ReplaceIcon} from '../../../assets/icons/kg-sync.svg';

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
            className="absolute mt-[-1px] w-full max-w-[240px] rounded-b border border-grey-200 bg-white shadow dark:border-grey-900 dark:bg-grey-950"
            tabIndex={0}
            onKeyDown={onKeyDown}
        >

            <li className="mb-0 block">
                <button
                    ref={buttonRef}
                    className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm font-medium text-green hover:bg-grey-100 focus:bg-grey-100 dark:hover:bg-black dark:focus:bg-black"
                    type="button"
                    onClick={onCreateSnippet}
                >
                    <span>Create &quot;{value}&ldquo;</span>
                    <PlusIcon className="h-3 w-3 stroke-green stroke-[3px]" />
                </button>
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
            <span className="tracking-loose block border-t border-grey-200 px-3 pt-3 pb-2 text-xs font-medium uppercase text-grey dark:border-grey-900 dark:text-grey-800">Replace existing</span>
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
        <li className="mb-1">
            <button
                ref={buttonRef}
                className="flex w-full cursor-pointer items-center justify-between py-2 px-3 text-left text-sm hover:bg-grey-100 focus:bg-grey-100 dark:hover:bg-black dark:focus:bg-black"
                type="button"
                onClick={onClick}
            >
                <span>{children}</span>
                <div className="h-5 w-5 fill-grey-900">
                    <ReplaceIcon className="h-4 w-4 fill-grey-900 dark:fill-grey-600" />
                </div>
            </button>
        </li>
    );
};
