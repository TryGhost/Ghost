import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import PropTypes from 'prop-types';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {UrlInput} from '../UrlInput';

export function EmbedCard({captionEditor, captionEditorInitialState, html, isSelected, urlInputValue, urlPlaceholder, urlError, isLoading, handleUrlChange, handleUrlInput, handleRetry, handlePasteAsLink, handleClose}) {
    if (html) {
        return (
            <div>
                <HtmlDisplay html={html} />
                <CardCaptionEditor
                    captionEditor={captionEditor}
                    captionEditorInitialState={captionEditorInitialState}
                    captionPlaceholder="Type caption for embedded (optional)"
                    dataTestId="embed-caption"
                    isSelected={isSelected}
                />
                <div className="absolute inset-0 z-50 mt-0"></div>
            </div>
        );
    }
    return (
        <UrlInput
            dataTestId="embed-url"
            handleClose={handleClose}
            handlePasteAsLink={handlePasteAsLink}
            handleRetry={handleRetry}
            handleUrlChange={handleUrlChange}
            handleUrlInput={handleUrlInput}
            hasError={urlError}
            isLoading={isLoading}
            placeholder={urlPlaceholder}
            value={urlInputValue}
        />
    );
}

function HtmlDisplay({html}) {
    return <div dangerouslySetInnerHTML={{__html: html}} className="whitespace-normal"></div>;
}

EmbedCard.propTypes = {
    html: PropTypes.string
};