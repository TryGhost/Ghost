import React from 'react';

export function UrlInput({dataTestId, value, placeholder, handleUrlChange, handleUrlInput, hasError, url, handlePasteAsLink, handleRetry, isLoading}) {
    if (isLoading) {
        return (
            <div>Loading Spinner Placeholder</div>
        );
    }
    if (hasError) {
        const containerStyles = {
            backgroundColor: 'rgba(240,82,48,.05)',
            borderColor: '#f85465',
            borderRadius: '0.3rem',
            borderStyle: `solid`,
            borderWidth: '1px',
            fontSize: '1.4rem',
            color: '#f50b23',
            display: 'flex',
            minWidth: '500px',
            paddingTop: '8px',
            paddingBottom: '8px'
        };
        const itemStyles = {
            marginRight: '1.2rem'
        };
        return (
            <div className="flex-row items-center" style={containerStyles}>
                <span style={{paddingLeft: '10px', ...itemStyles}}>There was an error when parsing the URL.</span>
                <button style={{color: '#c5081b', ...itemStyles}} type="button"><span className="underline" onClick={handleRetry}><strong>Retry</strong></span></button>
                <button style={{color: '#c5081b', ...itemStyles}} type="button"><span className="underline" onClick={handlePasteAsLink}><strong>Paste URL as link</strong></span></button>
                <button style={{paddingRight: '5px'}} type="button">
                    X
                </button>
            </div>
        );
    }
    if (!url) {
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
}