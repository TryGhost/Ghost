import AudioPlaceholderIcon from '../../assets/icons/kg-audio-placeholder.svg?react';
import FilePlaceholderIcon from '../../assets/icons/kg-file-placeholder.svg?react';
import GalleryPlaceholderIcon from '../../assets/icons/kg-gallery-placeholder.svg?react';
import ImgPlaceholderIcon from '../../assets/icons/kg-img-placeholder.svg?react';
import ProductPlaceholderIcon from '../../assets/icons/kg-product-placeholder.svg?react';
import PropTypes from 'prop-types';
import React from 'react';
import VideoPlaceholderIcon from '../../assets/icons/kg-video-placeholder.svg?react';

export const PLACEHOLDER_ICONS = {
    image: ImgPlaceholderIcon,
    gallery: GalleryPlaceholderIcon,
    video: VideoPlaceholderIcon,
    audio: AudioPlaceholderIcon,
    file: FilePlaceholderIcon,
    product: ProductPlaceholderIcon
};

export const CardText = ({text}) => {
    return (
        <span className="font-sans text-sm font-bold text-grey-800 transition-all group-hover:text-grey-800" data-kg-card-drag-text>{text}</span>
    );
};

export function MediaPlaceholder({
    desc,
    icon,
    filePicker,
    size,
    borderStyle,
    isDraggedOver,
    errors = [],
    placeholderRef,
    dataTestId = 'media-placeholder',
    errorDataTestId = 'media-placeholder-errors',
    multiple = false,
    ...props
}) {
    const Icon = PLACEHOLDER_ICONS[icon];

    return (
        <div
            ref={placeholderRef}
            className="not-kg-prose size-full" {...props}
            data-testid={dataTestId}
        >
            <div className={`relative flex h-full items-center justify-center border bg-grey-50 ${size === 'xsmall' ? 'before:pb-[12.5%] dark:bg-grey-900' : 'before:pb-[62.5%] dark:bg-grey-950'} ${borderStyle === 'rounded' ? 'rounded-lg border-grey/20 dark:border-transparent' : 'border-grey/20 dark:border-grey/10'}`}>
                {isDraggedOver ?
                    <CardText text={`Drop ${multiple ? '\'em' : 'it'} like it's hot 🔥`} /> :
                    <>
                        <button className={`group flex cursor-pointer select-none items-center justify-center ${size === 'xsmall' ? 'p-4' : 'flex-col p-20'}`} name="placeholder-button" type="button" onClick={filePicker}>
                            {(size === 'xsmall' && errors.length > 0) ||
                                <>
                                    <Icon className={`shrink-0 opacity-80 transition-all ease-linear hover:scale-105 group-hover:opacity-100 ${size === 'large' ? 'size-20 text-grey' : size === 'small' ? 'size-14 text-grey' : size === 'xsmall' ? 'size-5 text-grey-700' : 'size-16 text-grey'} ${(size === 'xsmall') && desc ? 'mr-3' : ''}`} />
                                    <p className={`flex min-w-[auto] !font-sans !text-sm !font-normal text-grey-700 opacity-80 transition-all group-hover:opacity-100 ${size === 'xsmall' ? '!mt-0' : '!mt-4'}`}>{desc}</p>
                                </>
                            }
                            {errors.map(error => (
                                <span
                                    key={error.message}
                                    className={`font-sans text-sm font-semibold text-red ${size === 'xsmall' || 'mt-3 max-w-[65%]'}`}
                                    data-testid={errorDataTestId}
                                >{error.message}</span>
                            ))}
                        </button>
                    </>
                }
            </div>
        </div>
    );
}

MediaPlaceholder.propTypes = {
    icon: PropTypes.oneOf(['image', 'gallery', 'video', 'audio', 'file', 'product']),
    desc: PropTypes.string,
    size: PropTypes.oneOf(['xsmall', 'small', 'medium', 'large']),
    borderStyle: PropTypes.oneOf(['squared', 'rounded'])
};

MediaPlaceholder.defaultProps = {
    borderStyle: 'squared'
};
