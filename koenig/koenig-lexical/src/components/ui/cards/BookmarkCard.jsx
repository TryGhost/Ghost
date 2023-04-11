import PropTypes from 'prop-types';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {UrlInput} from '../UrlInput';

export function BookmarkCard({
    author,
    handleClose,
    handlePasteAsLink,
    handleRetry,
    handleUrlChange,
    handleUrlInput,
    url,
    urlInputValue,
    urlPlaceholder,
    thumbnail,
    title,
    description,
    icon,
    publisher,
    caption,
    setCaption,
    isSelected,
    isLoading,
    urlError
}) {
    if (url) {
        return (
            <>
                <div className="flex min-h-[120px] w-full rounded border border-grey/40 bg-transparent font-sans dark:border-grey/20" data-testid="bookmark-container">
                    <div className="flex grow basis-full flex-col items-start justify-start p-5" data-testid="bookmark-text-container">
                        <div className="text-[1.5rem] font-semibold leading-normal tracking-normal text-grey-900 dark:text-grey-100" data-testid="bookmark-title">{title}</div>
                        <div className="mt-1 max-h-[44px] overflow-y-hidden text-sm font-normal leading-normal text-grey-800 line-clamp-2 dark:text-grey-600" data-testid="bookmark-description">{description}</div>
                        <div className="mt-[20px] flex items-center text-sm font-medium leading-9 text-grey-900">
                            {icon && <BookmarkIcon src={icon} />}
                            <span className=" db max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap leading-6 text-grey-900 dark:text-grey-100" data-testid="bookmark-publisher">{publisher}</span>
                            {author && <span className="font-normal text-grey-800 before:mx-1.5 before:text-grey-900 before:content-['•'] dark:text-grey-600 dark:before:text-grey-100" data-testid="bookmark-author">{author}</span>}
                        </div>
                    </div>
                    {thumbnail &&
                        (<div className={'grow-1 relative m-0 min-w-[33%]'} data-testid="bookmark-thumbnail-container">
                            <img alt="" className="absolute inset-0 h-full w-full rounded-r-[.3rem] object-cover" data-testid="bookmark-thumbnail" src={thumbnail}/>
                        </div>)
                    }
                </div>
                <CardCaptionEditor
                    caption={caption || ''}
                    captionPlaceholder="Type caption for bookmark (optional)"
                    dataTestId="bookmark-caption"
                    isSelected={isSelected}
                    setCaption={setCaption}
                />
                <div className="absolute inset-0 z-50 mt-0"></div>
            </>
        );
    }
    return (
        <UrlInput
            dataTestId="bookmark-url"
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

export function BookmarkIcon({src}) {
    return (
        <img alt="" className="mr-2 h-5 w-5 shrink-0" data-testid="bookmark-icon" src={src}/>
    );
}

BookmarkCard.propTypes = {
    handleUrlChange: PropTypes.func,
    handleUrlInput: PropTypes.func,
    url: PropTypes.string,
    urlInputValue: PropTypes.string,
    urlPlaceholder: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    icon: PropTypes.string,
    publisher: PropTypes.string,
    thumbnail: PropTypes.string
};
