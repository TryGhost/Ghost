import CloseIcon from '../../assets/icons/kg-close.svg?react';
import React from 'react';
import debounce from 'lodash/debounce';
import {InputList} from './InputList';

const DEBOUNCE_MS = 200;

function convertSearchResultsToListOptions(results) {
    return results.map((result) => {
        return {
            label: result.title,
            value: result.url
        };
    });
}

export function UrlSearchInput({dataTestId, value, placeholder, handleUrlChange, handleUrlSubmit, hasError, handlePasteAsLink, handleRetry, handleClose, isLoading, searchLinks}) {
    const [defaultListOptions, setDefaultListOptions] = React.useState([]);
    const [listOptions, setListOptions] = React.useState([]);
    const [isSearching, setIsSearching] = React.useState(false);

    const debouncedSearch = React.useMemo(() => {
        return debounce(async (term) => {
            setIsSearching(true);
            const results = await searchLinks(term);
            setListOptions(convertSearchResultsToListOptions(results));
            setIsSearching(false);
        }, DEBOUNCE_MS);
    }, [searchLinks]);

    // Fetch default search results when first rendering
    // TODO: feels kinda hacky, check React best practices
    React.useEffect(() => {
        const urlMatch = value?.match(/^http.*$/);

        if (!urlMatch) {
            const fetchDefaultOptions = async () => {
                setIsSearching(true);
                const results = await searchLinks();
                setDefaultListOptions(convertSearchResultsToListOptions(results));
                setIsSearching(false);
            };

            fetchDefaultOptions()
                .catch(console.error); // eslint-disable-line no-console
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

        // disable searching when a URL is entered to avoid unnecessary flashing
        const urlMatch = value?.match(/^http.*$/);

        if (urlMatch) {
            setListOptions([]);
        } else {
            debouncedSearch(inputValue);
        }
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

    const displayedListOptions = value ? listOptions : defaultListOptions;

    return (
        <div className="not-kg-prose" onKeyDown={handleKeyDown}>
            <InputList
                autoFocus={true}
                className={`w-full rounded border ${isSearching || displayedListOptions.length ? 'rounded-b-none border-b-0' : ''} border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 focus-visible:outline-none dark:border-grey-800 dark:bg-grey-950 dark:text-grey-100 dark:placeholder:text-grey-800`}
                dataTestId={dataTestId}
                isLoading={isSearching}
                listOptions={displayedListOptions}
                placeholder={placeholder}
                value={value}
                onChange={onChangeEvent}
                onSelect={onSelectEvent}
            />
        </div>
    );
}
