import React from 'react';
import {COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND} from 'lexical';
import {ReactComponent as CloseIcon} from '../../assets/icons/kg-close.svg';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function UrlInputPlugin({value, onEnter}) {
    const [editor] = useLexicalComposerContext();

    React.useEffect(
        (event) => {
            return mergeRegister(
                editor.registerCommand(
                    KEY_ENTER_COMMAND,
                    () => {
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
    if (isLoading) {
        return (
            <div className="border-grey-300 text-grey-900 dark:border-grey-800 dark:bg-grey-900 dark:placeholder:text-grey-800 flex w-full items-center justify-center rounded border p-2 font-sans text-sm font-normal leading-snug focus-visible:outline-none" data-testid={`${dataTestId}-loading-container`}>
                <div className="border-green/20 after:bg-green/70 -ml-1 mr-3 inline-block h-5 w-5 animate-spin rounded-full border-4 text-white after:mt-[11px] after:block after:h-1 after:w-1 after:rounded-full after:content-['']" data-testid={`${dataTestId}-loading-spinner`}></div>
            </div>
        );
    }
    if (hasError) {
        return (
            <div className="min-width-[500px] border-red bg-red/5 text-red flex flex-row items-center justify-between rounded-sm border px-3 py-2 text-sm leading-snug" data-testid={`${dataTestId}-error-container`}>
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
        <>
            <UrlInputPlugin value={value} onEnter={handleUrlSubmit} />
            <input
                autoFocus={true}
                className="border-grey-300 text-grey-900 dark:border-grey-800 dark:bg-grey-900 dark:placeholder:text-grey-800 w-full rounded border p-2 font-sans text-sm font-normal leading-snug focus-visible:outline-none"
                data-testid={dataTestId}
                placeholder={placeholder}
                value={value}
                onChange={handleUrlChange}
                onKeyDown={handleUrlSubmit}
            />
        </>
    );
}