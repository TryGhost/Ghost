import React from 'react';

export const Dropdown = ({snippets, onCreateSnippet, value}) => {
    return (
        <ul className="absolute mt-[-1px] w-full max-w-[240px] rounded-b border border-grey-200 bg-white py-1 shadow">
            <li className="mb-2 block px-4 pt-3">
                <button
                    className="cursor-pointer"
                    type="button"
                    onClick={onCreateSnippet}
                >Create &quot;{value}&ldquo;</button>
            </li>

            {!!snippets.length && <DropdownSection list={snippets} onClick={onCreateSnippet} />}
        </ul>
    );
};

const DropdownSection = ({list = [], onClick}) => {
    return (
        <li role="separator">
            <span className="mb-2 block px-4 pt-3 uppercase text-grey">Replace existing</span>
            <ul role="menu">
                {
                    list.map(item => (
                        <li key={item.name}>
                            <button
                                className="cursor-pointer py-2 px-4"
                                type="button"
                                onClick={onClick}
                            >
                                {item.name}
                            </button>
                        </li>
                    ))
                }
            </ul>
        </li>
    );
};
