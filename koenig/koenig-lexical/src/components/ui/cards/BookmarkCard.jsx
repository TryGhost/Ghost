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
                <div className="flex min-h-[120px] w-full rounded border border-grey/40 bg-white font-sans">
                    <div className="flex flex-col p-5">
                        <div className="text-[1.5rem] font-semibold leading-9 tracking-normal text-grey-900 line-clamp-1">{bookmarkTitle}</div>
                        <div className="mt-1 text-sm font-normal leading-9 text-grey-800 line-clamp-2">{bookmarkDesc}</div>
                        <div className="mt-2 flex items-center text-sm font-medium leading-9 text-grey-900">
                            {bookmarkIcon && <BookmarkIcon />}
                            <span className="line-clamp-1">{bookmarkPublisher}</span>
                        </div>
                    </div>
                    <div className={`${bookmarkThumbnail ? 'grow-1 min-w-[33%] rounded-r-[.3rem] bg-grey-300' : ''}`}></div>
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
        <input className="w-full rounded border border-grey/60 p-2 font-sans text-sm font-normal text-grey-900" value={urlValue} placeholder={urlPlaceholder} />
    );
}

export function BookmarkIcon() {
    return (
        <div className="mr-2 h-5 w-5 shrink-0 rounded-lg bg-black"></div>
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