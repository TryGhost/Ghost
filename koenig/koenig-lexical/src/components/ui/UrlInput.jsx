import React from 'react';
import {ReactComponent as CloseIcon} from '../../assets/icons/kg-close.svg';

export function UrlInput({dataTestId, value, placeholder, handleUrlChange, handleUrlInput, hasError, handlePasteAsLink, handleRetry, handleClose, isLoading}) {
    if (isLoading) {
        return (
            <div>Loading Spinner Placeholder</div>
        );
    }
    if (hasError) {
        return (
            <div className="min-width-[500px] flex flex-row items-center justify-between rounded-sm border border-red bg-red/5 px-3 py-2 text-sm leading-snug text-red">
                <div>
                    <span className="mr-3">There was an error when parsing the URL.</span>
                    <button className="mr-3" type="button"><span className="underline" onClick={handleRetry}><strong>Retry</strong></span></button>
                    <button className="mr-3" type="button"><span className="underline" onClick={handlePasteAsLink}><strong>Paste URL as link</strong></span></button>
                </div>
                <button type="button" onClick={handleClose}>
                    <CloseIcon className="red h-3 w-3"/>
                </button>
            </div>
        );
    }
    return (
        <input
            className="w-full rounded border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 focus-visible:outline-none"
            data-testid={dataTestId}
            placeholder={placeholder}
            value={value}
            onBlur={handleUrlInput}
            onChange={handleUrlChange}
        />
    );
}