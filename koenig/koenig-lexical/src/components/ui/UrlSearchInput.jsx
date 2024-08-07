import CloseIcon from '../../assets/icons/kg-close.svg?react';
import React from 'react';
import trackEvent from '../../utils/analytics';
import {InputList} from './InputList';
import {LinkInputSearchItem} from './LinkInputSearchItem';
import {useSearchLinks} from '../../hooks/useSearchLinks';

export function UrlSearchInput({dataTestId, value, placeholder, handleUrlChange, handleUrlSubmit, hasError, handlePasteAsLink, handleRetry, handleClose, isLoading, searchLinks}) {
    const {isSearching, listOptions} = useSearchLinks(value, searchLinks);

    React.useEffect(() => {
        if (!value) {
            trackEvent('Link dropdown: Opened', {context: 'bookmark'});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleClose]);

    if (isLoading) {
        return (
            <div className="flex w-full items-center justify-center rounded-md border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 focus-visible:outline-none dark:border-grey-800 dark:bg-grey-900 dark:placeholder:text-grey-800" data-testid={`${dataTestId}-loading-container`}>
                <div className="-ml-1 mr-3 inline-block size-5 animate-spin rounded-full border-4 border-green/20 text-white after:mt-[11px] after:block after:size-1 after:rounded-full after:bg-green/70 after:content-['']" data-testid={`${dataTestId}-loading-spinner`}></div>
            </div>
        );
    }
    if (hasError) {
        return (
            <div className="min-width-[500px] flex flex-row items-center justify-between rounded-md border border-grey-300 px-3 py-2 text-sm font-normal leading-snug text-grey-900" data-testid={`${dataTestId}-error-container`}>
                <div>
                    <span className="mr-3" data-testid={`${dataTestId}-error-message`}>Oops, that link didn&apos;t work.</span>
                    <button className="mr-3 cursor-pointer" data-testid={`${dataTestId}-error-retry`} type="button"><span className="font-semibold underline" onClick={handleRetry}>Retry</span></button>
                    <button className="mr-3 cursor-pointer" data-testid={`${dataTestId}-error-pasteAsLink`} type="button"><span className="font-semibold underline" onClick={() => handlePasteAsLink(value)}>Paste URL as link</span></button>
                </div>
                <button className="cursor-pointer p-1" data-testid={`${dataTestId}-error-close`} type="button" onClick={handleClose}>
                    <CloseIcon className="size-4 stroke-2 text-grey-400"/>
                </button>
            </div>
        );
    }

    const onChangeEvent = async (inputValue) => {
        handleUrlChange(inputValue);
    };

    const onSelectEvent = (selectedItemOrValue, type) => {
        if (selectedItemOrValue === null) {
            return;
        }

        const url = selectedItemOrValue && typeof selectedItemOrValue === 'string' ? selectedItemOrValue : selectedItemOrValue.value;
        handleUrlSubmit(url, type);
    };

    const handleKeyDown = (event) => {
        if (!event.isComposing && event.key === 'Enter') {
            event.preventDefault();
            handleUrlSubmit(event.target.value);
        }
    };

    const getItem = (item, selected, onMouseOver, scrollIntoView) => {
        return (
            <LinkInputSearchItem
                key={item.value}
                dataTestId={dataTestId}
                highlightString={value}
                item={item}
                scrollIntoView={scrollIntoView}
                selected={selected}
                onClick={onSelectEvent}
                onMouseOver={onMouseOver}
            />
        );
    };

    return (
        <div className="not-kg-prose" onKeyDown={handleKeyDown}>
            <InputList
                autoFocus={true}
                dataTestId={dataTestId}
                dropdownClassName='z-[-1] max-h-[30vh] w-full overflow-y-auto bg-white px-2 py-1 shadow-md dark:bg-grey-950'
                dropdownPlacementBottomClass='mt-[.6rem] rounded-md'
                dropdownPlacementTopClass='top-[-.6rem] -translate-y-full rounded-md'
                getItem={getItem}
                inputClassName={`w-full rounded-md border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 placeholder:text-grey-500 focus-visible:outline-none dark:border-grey-800 dark:bg-grey-950 dark:text-grey-100 dark:placeholder:text-grey-800`}
                isLoading={isSearching}
                listOptions={listOptions}
                placeholder={placeholder}
                value={value}
                onChange={onChangeEvent}
                onSelect={onSelectEvent}
            />
        </div>
    );
}
