import React, {useEffect, useRef, useState} from 'react';
import {ReactComponent as ChevronIcon} from '../../../images/icons/chevron-down.svg';
import {useOrderChange} from '../../../AppContext';

export const SortingForm: React.FC = () => {
    const changeOrder = useOrderChange();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState('count__likes desc, created_at desc');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const options = [
        {value: 'count__likes desc, created_at desc', label: 'Best'},
        {value: 'created_at desc', label: 'Newest'},
        {value: 'created_at asc', label: 'Oldest'}
    ];

    const handleOptionClick = (value: string) => {
        setSelectedOption(value);
        changeOrder(value);
        setIsOpen(false);
    };

    useEffect(() => {
        const listener = () => {
            setIsOpen(false);
        };

        // We need to listen for the window outside the iframe, and also the iframe window events
        window.addEventListener('click', listener, {passive: true});
        const el = dropdownRef.current?.ownerDocument?.defaultView;

        if (el && el !== window) {
            el.addEventListener('click', listener, {passive: true});
        }

        return () => {
            window.removeEventListener('click', listener, {passive: true} as any);
            if (el && el !== window) {
                el.removeEventListener('click', listener, {passive: true} as any);
            }
        };
    }, []);

    // Prevent closing the dropdown when clicking inside of it
    const stopPropagation = (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    return (
        <div ref={dropdownRef} className="relative" data-testid="comments-sorting-form" onClick={stopPropagation}>
            <button
                className="flex w-full items-center justify-between gap-2 text-sm font-medium text-neutral-900 focus-visible:outline-none dark:text-neutral-100"
                type="button"
                onClick={() => setIsOpen(!isOpen)}
            >
                {options.find(option => option.value === selectedOption)?.label}
                <span className="h-2 w-2 stroke-[3px]"><ChevronIcon /></span>
            </button>

            {isOpen && (
                <div className="absolute -left-4 mt-1.5 w-36 origin-top-right rounded-md bg-white shadow-lg dark:bg-neutral-800">
                    <div aria-labelledby="options-menu" aria-orientation="vertical" className="py-1" data-testid="comments-sorting-form-dropdown" role="menu">
                        {options.map(option => (
                            <button
                                key={option.value}
                                className="block w-full px-4 py-1.5 text-left text-sm text-neutral-600 transition-all hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-white"
                                role="menuitem"
                                type="button"
                                onClick={() => handleOptionClick(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
