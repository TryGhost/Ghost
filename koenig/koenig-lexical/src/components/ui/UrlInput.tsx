import CloseIcon from '../../assets/icons/kg-close.svg?react';
import React from 'react';
import {COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND} from 'lexical';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function UrlInputPlugin({value, onEnter}) {
    const [editor] = useLexicalComposerContext();

    React.useEffect(
        () => {
            return mergeRegister(
                editor.registerCommand(
                    KEY_ENTER_COMMAND,
                    (event) => {
                        onEnter(event);
                        return false;
                    },
                    COMMAND_PRIORITY_LOW
                )
            );
        },
        [editor, onEnter, value]
    );
}

export function UrlInput({dataTestId, value, placeholder, handleUrlChange, handleUrlSubmit, hasError, handlePasteAsLink, handleRetry, handleClose, isLoading}) {
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
    return (
        <>
            <UrlInputPlugin value={value} onEnter={handleUrlSubmit} />
            <input
                autoFocus={true}
                className="w-full rounded-md border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 focus-visible:outline-none dark:border-grey-800 dark:bg-grey-950 dark:text-grey-100 dark:placeholder:text-grey-800"
                data-testid={dataTestId}
                placeholder={placeholder}
                value={value}
                onChange={handleUrlChange}
                onKeyDown={handleUrlSubmit}
            />
        </>
    );
}
