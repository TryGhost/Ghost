import React from 'react';
import { IUnsplashProvider } from './api/IUnsplashProvider';
import { Photo } from './UnsplashTypes';
interface UnsplashModalProps {
    onClose: () => void;
    onImageInsert: (image: Photo) => void;
    unsplashProvider: IUnsplashProvider;
}
declare const UnsplashSearchModal: React.FC<UnsplashModalProps>;
export default UnsplashSearchModal;
