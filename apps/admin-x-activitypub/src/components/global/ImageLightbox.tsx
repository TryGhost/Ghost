import React, {useCallback, useEffect, useState} from 'react';
import {Button, Dialog, DialogClose, DialogContent, LucideIcon} from '@tryghost/shade';
import {ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {getAttachment} from '@components/feed/FeedItem';

export interface LightboxImage {
    url: string;
    alt: string;
}

export interface LightboxState {
    images: LightboxImage[];
    currentIndex: number;
    isOpen: boolean;
}

export function useLightboxImages(object: ObjectProperties | null) {
    const [lightboxState, setLightboxState] = useState<LightboxState>({
        images: [],
        currentIndex: 0,
        isOpen: false
    });

    const getAllImagesFromAttachment = (obj: ObjectProperties): LightboxImage[] => {
        const attachment = getAttachment(obj);
        if (!attachment) {
            return [];
        }

        if (Array.isArray(attachment)) {
            return attachment.map((item, index) => ({
                url: item.url,
                alt: item.name || `Image-${index}`
            }));
        }

        if (attachment.mediaType?.startsWith('image/') || attachment.type === 'Image') {
            return [{
                url: attachment.url,
                alt: attachment.name || 'Image'
            }];
        }

        if (obj.image) {
            let imageUrl;
            if (typeof obj.image === 'string') {
                imageUrl = obj.image;
            } else {
                imageUrl = obj.image?.url;
            }

            if (imageUrl) {
                return [{
                    url: imageUrl,
                    alt: 'Image'
                }];
            }
        }

        return [];
    };

    const openLightbox = (clickedUrl: string) => {
        if (!object) {
            return;
        }

        const images = getAllImagesFromAttachment(object);
        const clickedIndex = images.findIndex(img => img.url === clickedUrl);

        if (clickedIndex !== -1) {
            setLightboxState({
                images,
                currentIndex: clickedIndex,
                isOpen: true
            });
        }
    };

    const closeLightbox = () => {
        setLightboxState(prev => ({
            ...prev,
            isOpen: false
        }));
    };

    const navigateToIndex = (newIndex: number) => {
        setLightboxState(prev => ({
            ...prev,
            currentIndex: newIndex
        }));
    };

    return {
        lightboxState,
        openLightbox,
        closeLightbox,
        navigateToIndex
    };
}

interface ImageLightboxProps {
    images: LightboxImage[];
    currentIndex: number;
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (newIndex: number) => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({
    images,
    currentIndex,
    isOpen,
    onClose,
    onNavigate
}) => {
    const isFirstImage = currentIndex === 0;
    const isLastImage = currentIndex === images.length - 1;

    const goToNext = useCallback(() => {
        if (images.length <= 1 || isLastImage) {
            return;
        }
        const nextIndex = (currentIndex + 1) % images.length;
        onNavigate(nextIndex);
    }, [images.length, isLastImage, currentIndex, onNavigate]);

    const goToPrev = useCallback(() => {
        if (images.length <= 1 || isFirstImage) {
            return;
        }
        const prevIndex = (currentIndex - 1 + images.length) % images.length;
        onNavigate(prevIndex);
    }, [images.length, isFirstImage, currentIndex, onNavigate]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) {
                return;
            }

            if (e.key === 'ArrowRight' && !isLastImage) {
                goToNext();
            } else if (e.key === 'ArrowLeft' && !isFirstImage) {
                goToPrev();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, currentIndex, images.length, goToNext, goToPrev, isLastImage, isFirstImage]);

    if (!isOpen || images.length === 0) {
        return null;
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="top-[50%] h-[100vh] max-h-[100vh] w-[100vw] max-w-[100vw] translate-y-[-50%] items-center border-none bg-transparent p-0 shadow-none data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 data-[state=closed]:slide-out-to-top-[50%] data-[state=open]:slide-in-from-top-[50%]" onClick={() => onClose()}>
                <img
                    alt={images[currentIndex].alt}
                    className="mx-auto max-h-[90vh] max-w-[90vw] object-contain"
                    src={images[currentIndex].url}
                    onClick={e => e.stopPropagation()}
                />

                {images.length > 1 && (
                    <>
                        <Button
                            className="absolute left-5 top-1/2 size-11 -translate-y-1/2 rounded-full bg-black/50 p-0 pr-0.5 hover:bg-black/70"
                            disabled={isFirstImage}
                            onClick={(e) => {
                                e.stopPropagation();
                                goToPrev();
                            }}
                        >
                            <LucideIcon.ChevronLeft className="!size-6" />
                            <span className="sr-only">Previous image</span>
                        </Button>

                        <Button
                            className="absolute right-5 top-1/2 size-11 -translate-y-1/2 rounded-full bg-black/50 p-0 pl-0.5 hover:bg-black/70"
                            disabled={isLastImage}
                            onClick={(e) => {
                                e.stopPropagation();
                                goToNext();
                            }}
                        >
                            <LucideIcon.ChevronRight className="!size-6" />
                            <span className="sr-only">Next image</span>
                        </Button>
                    </>
                )}
                <DialogClose asChild>
                    <Button className="absolute right-5 top-5 size-11 rounded-full bg-black/50 p-0 hover:bg-black/70">
                        <LucideIcon.X className="!size-5" />
                        <span className="sr-only">Close</span>
                    </Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    );
};

export default ImageLightbox;
