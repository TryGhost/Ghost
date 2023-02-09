import React from 'react';
import PropTypes from 'prop-types';
import {ReactComponent as ImgPlaceholderIcon} from '../../assets/icons/kg-img-placeholder.svg';
import {ReactComponent as GalleryPlaceholderIcon} from '../../assets/icons/kg-gallery-placeholder.svg';
import {ReactComponent as VideoPlaceholderIcon} from '../../assets/icons/kg-video-placeholder.svg';
import {ReactComponent as AudioPlaceholderIcon} from '../../assets/icons/kg-audio-placeholder.svg';
import {ReactComponent as FilePlaceholderIcon} from '../../assets/icons/kg-file-placeholder.svg';
import {ReactComponent as ProductPlaceholderIcon} from '../../assets/icons/kg-product-placeholder.svg';

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
        <span data-kg-card-drag-text className="font-sans text-sm font-bold text-grey-800 transition-all group-hover:text-grey-800">{text}</span>
    );
};

export function MediaPlaceholder({desc, icon, filePicker, size, borderStyle, handleDrag, handleDrop, isDraggedOver, errors = [], placeholderRef, dataTestId = 'media-placeholder', errorDataTestId, ...props}) {
    const Icon = PLACEHOLDER_ICONS[icon];

    return (
        <div
            ref={placeholderRef}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className="h-full border border-transparent" {...props}
            data-testid={dataTestId}
        >
            <div className={`relative flex h-full items-center justify-center border bg-grey-50 ${size === 'xsmall' ? 'before:pb-[12.5%]' : 'before:pb-[62.5%]'} ${borderStyle === 'dashed' ? 'rounded border-dashed border-grey/40' : 'border-grey/20'}`}>
                {isDraggedOver ?
                    <CardText text="Drop it like it's hot 🔥" /> :
                    <>
                        <button onClick={filePicker} name="placeholder-button" className={`group flex cursor-pointer items-center justify-center ${size === 'xsmall' ? 'p-4' : 'flex-col p-20'}`}>
                            {(size === 'xsmall' && errors.length > 0) ||
                                <>
                                    <Icon className={`opacity-80 transition-all ease-linear group-hover:scale-105 group-hover:opacity-100 ${size === 'large' ? 'h-20 w-20 text-grey' : size === 'small' ? 'h-14 w-14 text-grey' : size === 'xsmall' ? 'h-6 w-6 text-grey-700' : 'h-16 w-16 text-grey'} ${(size === 'xsmall') && desc ? 'mr-3' : ''}`} />
                                    <p className={`font-sans text-sm font-normal text-grey-700 transition-all group-hover:text-grey-800 ${size === 'xsmall' ? '' : 'mt-4'}`}>{desc}</p>
                                </>
                            }
                            {errors.map((error, index) => (
                                <span
                                    className={`font-sans text-sm font-semibold text-red ${size === 'xsmall' || 'mt-3 max-w-[65%]'}`}
                                    data-testid={errorDataTestId}
                                    key={index}
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
    icon: PropTypes.string,
    desc: PropTypes.string,
    size: PropTypes.oneOf(['xsmall', 'small', 'medium', 'large']),
    borderStyle: PropTypes.oneOf(['solid', 'dashed'])
};
