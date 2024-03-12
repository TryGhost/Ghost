import { UnsplashImageProps } from './UnsplashImage';
import { FC } from 'react';
import { Photo } from '../UnsplashTypes';
interface UnsplashZoomedProps extends Omit<UnsplashImageProps, 'zoomed'> {
    zoomed: Photo | null;
    selectImg: (photo: Photo | null) => void;
}
declare const UnsplashZoomed: FC<UnsplashZoomedProps>;
export default UnsplashZoomed;
