import { FC } from 'react';
import { Links, Photo, User } from '../UnsplashTypes';
export interface UnsplashImageProps {
    payload: Photo;
    srcUrl: string;
    links: Links;
    likes: number;
    user: User;
    alt: string;
    urls: {
        regular: string;
    };
    height: number;
    width: number;
    zoomed: Photo | null;
    insertImage: (options: {
        src: string;
        caption: string;
        height: number;
        width: number;
        alt: string;
        links: Links;
    }) => void;
    selectImg: (payload: Photo | null) => void;
}
declare const UnsplashImage: FC<UnsplashImageProps>;
export default UnsplashImage;
