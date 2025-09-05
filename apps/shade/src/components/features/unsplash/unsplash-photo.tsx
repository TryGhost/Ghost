import React from 'react';
import {cn} from '@/lib/utils';
import {UnsplashPhoto} from '@/hooks/use-unsplash';

interface UnsplashPhotoProps {
    photo: UnsplashPhoto;
    onSelect: (photo: UnsplashPhoto) => void;
    onZoom?: (photo: UnsplashPhoto) => void;
    zoomed?: boolean;
    className?: string;
}

export const UnsplashPhotoComponent: React.FC<UnsplashPhotoProps> = ({
    photo,
    onSelect,
    onZoom,
    zoomed = false,
    className
}) => {
    const handleClick = () => {
        if (zoomed) {
            onSelect(photo);
        } else if (onZoom) {
            onZoom(photo);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    const imageUrl = zoomed 
        ? photo.urls.regular.replace(/&w=\d+/, '&w=2000')
        : photo.urls.regular;

    const containerClasses = cn(
        'group relative cursor-pointer overflow-hidden bg-gray-100 transition-all duration-200',
        'hover:shadow-lg',
        'mb-4',
        zoomed ? 'max-h-[40vh] max-w-[40vw]' : '',
        className
    );

    const imageClasses = cn(
        'w-full h-auto object-cover transition-transform duration-200',
        zoomed ? 'max-h-[40vh]' : ''
    );

    return (
        <div
            aria-label={photo.description || photo.alt_description || 'Unsplash photo'}
            className={containerClasses}
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
        >
            <img
                alt={photo.description || photo.alt_description || ''}
                className={imageClasses}
                loading="lazy"
                src={imageUrl}
                style={{
                    aspectRatio: photo.ratio ? `${1 / photo.ratio}` : 'auto',
                    minHeight: '200px'
                }}
            />
            
            {/* Overlay with photographer info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <p className="truncate text-sm font-medium">
                        {photo.user.name}
                    </p>
                    {photo.description && (
                        <p className="truncate text-xs opacity-90">
                            {photo.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Selection indicator */}
            {zoomed && (
                <div className="absolute right-2 top-2 rounded-full bg-green-500 p-2 text-white shadow-lg">
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                </div>
            )}
        </div>
    );
};
