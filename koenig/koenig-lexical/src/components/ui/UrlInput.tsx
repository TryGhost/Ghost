import CardContext from '../../context/CardContext';
import CloseIcon from '../../assets/icons/kg-close.svg?react';
import React from 'react';

export function UrlInput({dataTestId, value, placeholder, handleUrlChange, handleUrlSubmit, hasError, handlePasteAsLink, handleRetry, handleClose, isLoading}) {
    const {isSelected} = React.useContext(CardContext);
    const inputRef = React.useRef(null);
    const showsField = !isLoading && !hasError;

    React.useEffect(() => {
        // window hears Escape from the whole page, so a card showing its field answers only for that field
        // or when selected. The error and loading states have no field and answer any Escape
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && (!showsField || isSelected || e.target === inputRef.current)) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleClose, isSelected, showsField]);

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
    return (
        <input
            ref={inputRef}
            autoFocus={true}
            className="w-full rounded-md border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 focus-visible:outline-none dark:border-grey-800 dark:bg-grey-950 dark:text-grey-100 dark:placeholder:text-grey-800"
            data-testid={dataTestId}
            placeholder={placeholder}
            value={value}
            onChange={handleUrlChange}
            onKeyDown={handleUrlSubmit}
        />
    );
}
