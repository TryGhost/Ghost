import PropTypes from 'prop-types';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';

export function BookmarkCard({
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
    isSelected
}) {
    if (url) {
        return (
            <>
                <div className="flex min-h-[120px] w-full rounded border border-grey/40 bg-white font-sans">
                    <div className="flex flex-col p-5">
                        <div className="text-[1.5rem] font-semibold leading-9 tracking-normal text-grey-900 line-clamp-1">{title}</div>
                        <div className="mt-1 text-sm font-normal leading-9 text-grey-800 line-clamp-2">{description}</div>
                        <div className="mt-2 flex items-center text-sm font-medium leading-9 text-grey-900">
                            {icon && <BookmarkIcon src={icon} />}
                            <span className="line-clamp-1">{publisher}</span>
                        </div>
                    </div>
                    {thumbnail ?   
                        <div>
                            <img alt="" src={thumbnail} />
                        </div>
                        : <div className={'grow-1 min-w-[33%] rounded-r-[.3rem] bg-grey-300'}></div>
                    }
                </div>
                <CardCaptionEditor
                    caption={caption || ''}
                    captionPlaceholder="Type caption for bookmark (optional)"
                    isSelected={isSelected}
                    setCaption={setCaption}
                />  
            </>
        );
    }
    return (
        <input className="w-full rounded border border-grey/60 p-2 font-sans text-sm font-normal text-grey-900" placeholder={urlPlaceholder} value={urlInputValue} onBlur={handleUrlInput} onChange={handleUrlChange} />
    );
}

export function BookmarkIcon({src}) {
    return (
        <div className="mr-2 h-7 w-7 shrink-0 rounded-lg bg-black">
            <img alt="" src={src}/>
        </div>
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