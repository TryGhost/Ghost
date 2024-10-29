import PlusIcon from '../../../assets/icons/plus.svg?react';
import React from 'react';
import ReplaceIcon from '../../../assets/icons/kg-sync.svg?react';

export const Dropdown = ({
    snippets,
    onCreateSnippet,
    onUpdateSnippet,
    value,
    isCreateButtonActive,
    onKeyDown,
    activeMenuItem
}) => {
    return (
        <ul
            className="absolute mt-[-1px] w-full max-w-[240px] rounded-b border border-grey-200 bg-white shadow-md dark:border-grey-900 dark:bg-grey-950"
            tabIndex={0}
            onKeyDown={onKeyDown}
        >

            <li className="mb-0 block">
                <button
                    className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm font-medium text-green-600 hover:bg-grey-100 dark:hover:bg-black ${isCreateButtonActive ? 'bg-grey-100 dark:bg-black' : ''}`}
                    type="button"
                    onClick={onCreateSnippet}
                >
                    <span>Create &quot;{value}&ldquo;</span>
                    <PlusIcon className="size-3 stroke-green-600 stroke-[3px]" />
                </button>
            </li>

            {!!snippets.length && (
                <DropdownSection
                    activeMenuItem={activeMenuItem}
                    list={snippets}
                    onClick={onUpdateSnippet}
                />
            )}
        </ul>
    );
};

const DropdownSection = ({list = [], onClick, activeMenuItem}) => {
    return (
        <li role="separator">
            <span className="block border-t border-grey-200 px-3 pb-2 pt-3 text-[1.1rem] font-semibold uppercase tracking-wide text-grey-600 dark:border-grey-900 dark:text-grey-800">Replace existing</span>
            <ul role="menu">
                {
                    list.map((item, index) => (
                        <DropdownItem
                            key={item.name}
                            active={activeMenuItem}
                            index={index}
                            name={item.name}
                            onClick={onClick}
                        />
                    ))
                }
            </ul>
        </li>
    );
};

const DropdownItem = ({onClick, name, active, index}) => {
    return (
        <li className="mb-1">
            <button
                // ref={buttonRef}
                className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm hover:bg-grey-100 ${index === active ? 'bg-grey-100 dark:bg-black' : ''} dark:hover:bg-black`}
                type="button"
                onClick={() => onClick(name)}
            >
                <span>{name}</span>
                <div className="size-5 fill-grey-900">
                    <ReplaceIcon className="size-4 fill-grey-900 dark:fill-grey-600" />
                </div>
            </button>
        </li>
    );
};
