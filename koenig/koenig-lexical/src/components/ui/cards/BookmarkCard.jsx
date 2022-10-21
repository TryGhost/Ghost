import React from 'react';
import PropTypes from 'prop-types';
import {CardCaptionEditor} from '../CardCaptionEditor';

export function BookmarkCard({
    urlValue, 
    urlPlaceholder, 
    bookmarkThumbnail, 
    bookmarkTitle, 
    bookmarkDesc,
    bookmarkIcon, 
    bookmarkPublisher, 
    caption, 
    setCaption, 
    isSelected
}) {
    if (urlValue) {
        return (
            <>
                <div className="min-h-[120px] flex w-full rounded border border-grey/30 bg-white font-sans">
                    <div className="flex-col flex p-5">
                        <div className="text-[1.5rem] font-semibold tracking-normal leading-9 text-grey-900">{bookmarkTitle}</div>
                        <div className="text-sm font-normal text-grey-800 leading-9 mt-1">{bookmarkDesc}</div>
                        <div className="text-sm font-medium text-grey-900 leading-9 mt-2 flex items-center">{bookmarkIcon && <BookmarkIcon />}{bookmarkPublisher}</div>
                    </div>
                    <div className={`${bookmarkThumbnail ? 'grow-1 bg-grey min-w-[33%] rounded-r-[.3rem]' : ''}`}></div>
                </div>
                <CardCaptionEditor
                    caption={caption || ''}
                    setCaption={setCaption}
                    captionPlaceholder="Type caption for bookmark (optional)"
                    isSelected={isSelected}
                />  
            </>
        );
    }
    return (
        <input className="border border-grey/60 w-full rounded p-2 text-sm font-sans font-normal text-grey-900" value={urlValue} placeholder={urlPlaceholder} />
    );
}

export function BookmarkIcon() {
    return (
        <div className="w-5 h-5 bg-black rounded-lg mr-2"></div>
    );
}

BookmarkCard.propTypes = {
    urlValue: PropTypes.string,
    urlPlaceholder: PropTypes.string,
    bookmarkTitle: PropTypes.string,
    bookmarkDesc: PropTypes.string,
    bookmarkIcon: PropTypes.bool,
    bookmarkPublisher: PropTypes.string,
    bookmarkThumbnail: PropTypes.bool
};