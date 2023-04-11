import React from 'react';
import {ReactComponent as CloseIcon} from '../../assets/icons/kg-close.svg';

export function UrlInput({dataTestId, value, placeholder, handleUrlChange, handleUrlInput, hasError, handlePasteAsLink, handleRetry, handleClose, isLoading}) {
    if (isLoading) {
        return (
            <div className="flex w-full items-center justify-center rounded border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 focus-visible:outline-none dark:border-grey-800 dark:bg-grey-900 dark:placeholder:text-grey-800" data-testid={`${dataTestId}-loading-container`}>
                <div className="-ml-1 mr-3 inline-block h-5 w-5 animate-spin rounded-full border-4 border-green/20 text-white after:mt-[11px] after:block after:h-1 after:w-1 after:rounded-full after:bg-green/70 after:content-['']" data-testid={`${dataTestId}-loading-spinner`}></div>
            </div>
        );
    }
    if (hasError) {
        return (
            <div className="min-width-[500px] flex flex-row items-center justify-between rounded-sm border border-red bg-red/5 px-3 py-2 text-sm leading-snug text-red" data-testid={`${dataTestId}-error-container`}>
                <div>
                    <span className="mr-3" data-testid={`${dataTestId}-error-message`}>There was an error when parsing the URL.</span>
                    <button className="mr-3 cursor-pointer" data-testid={`${dataTestId}-error-retry`} type="button"><span className="underline" onClick={handleRetry}><strong>Retry</strong></span></button>
                    <button className="mr-3 cursor-pointer" data-testid={`${dataTestId}-error-pasteAsLink`} type="button"><span className="underline" onClick={handlePasteAsLink}><strong>Paste URL as link</strong></span></button>
                </div>
                <button className="cursor-pointer p-1" data-testid={`${dataTestId}-error-close`} type="button" onClick={handleClose}>
                    <CloseIcon className="red h-3 w-3"/>
                </button>
            </div>
        );
    }
    return (
        <input
            autoFocus={true}
            className="w-full rounded border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 focus-visible:outline-none dark:border-grey-800 dark:bg-grey-900 dark:placeholder:text-grey-800"
            data-testid={dataTestId}
            placeholder={placeholder}
            value={value}
            onBlur={handleUrlInput}
            onChange={handleUrlChange}
        />
    );
}