import React, { ReactNode, RefObject } from 'react';
import { Photo } from '../UnsplashTypes';
interface MasonryColumnProps {
    children: ReactNode;
}
interface GalleryLayoutProps {
    children?: ReactNode;
    galleryRef: RefObject<HTMLDivElement>;
    isLoading?: boolean;
    zoomed?: Photo | null;
}
interface UnsplashGalleryProps extends GalleryLayoutProps {
    error?: string | null;
    dataset?: Photo[][] | [];
    selectImg?: any;
    insertImage?: any;
}
export declare const MasonryColumn: React.FC<MasonryColumnProps>;
declare const UnsplashGallery: React.FC<UnsplashGalleryProps>;
export default UnsplashGallery;
