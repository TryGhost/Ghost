import CloseIcon from '../../assets/icons/kg-close.svg?react';
import React from 'react';
import {InputListCopy} from './InputListCopy';
import {useSearchLinks} from '../../hooks/useSearchLinks';

export function UrlSearchInput({dataTestId, value, placeholder, handleUrlChange, handleUrlSubmit, hasError, handlePasteAsLink, handleRetry, handleClose, isLoading, searchLinks}) {
    const {isSearching, listOptions} = useSearchLinks(value, searchLinks);

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
            <div className="flex w-full items-center justify-center rounded border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 focus-visible:outline-none dark:border-grey-800 dark:bg-grey-900 dark:placeholder:text-grey-800" data-testid={`${dataTestId}-loading-container`}>
                <div className="-ml-1 mr-3 inline-block size-5 animate-spin rounded-full border-4 border-green/20 text-white after:mt-[11px] after:block after:size-1 after:rounded-full after:bg-green/70 after:content-['']" data-testid={`${dataTestId}-loading-spinner`}></div>
            </div>
        );
    }
    if (hasError) {
        return (
            <div className="min-width-[500px] flex flex-row items-center justify-between rounded-sm border border-red bg-red/5 px-3 py-2 text-sm leading-snug text-red" data-testid={`${dataTestId}-error-container`}>
                <div>
                    <span className="mr-3" data-testid={`${dataTestId}-error-message`}>There was an error when parsing the URL.</span>
                    <button className="mr-3 cursor-pointer" data-testid={`${dataTestId}-error-retry`} type="button"><span className="underline" onClick={handleRetry}><strong>Retry</strong></span></button>
                    <button className="mr-3 cursor-pointer" data-testid={`${dataTestId}-error-pasteAsLink`} type="button"><span className="underline" onClick={() => handlePasteAsLink(value)}><strong>Paste URL as link</strong></span></button>
                </div>
                <button className="cursor-pointer p-1" data-testid={`${dataTestId}-error-close`} type="button" onClick={handleClose}>
                    <CloseIcon className="red size-3"/>
                </button>
            </div>
        );
    }

    const onChangeEvent = async (inputValue) => {
        handleUrlChange(inputValue);
    };

    const onSelectEvent = (selectedValue) => {
        handleUrlSubmit(selectedValue);
    };

    const handleKeyDown = (event) => {
        if (!event.isComposing && event.key === 'Enter') {
            event.preventDefault();
            handleUrlSubmit(event.target.value);
        }
    };

    return (
        <div className="not-kg-prose" onKeyDown={handleKeyDown}>
            <InputListCopy
                autoFocus={true}
                dataTestId={dataTestId}
                inputClassName={`w-full rounded border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 placeholder:text-grey-500 focus-visible:outline-none dark:border-grey-800 dark:bg-grey-950 dark:text-grey-100 dark:placeholder:text-grey-800`}
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
