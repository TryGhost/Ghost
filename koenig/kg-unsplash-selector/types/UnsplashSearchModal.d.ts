import React from 'react';
import { DefaultHeaderTypes } from './UnsplashTypes';
import { Photo } from './UnsplashTypes';
interface UnsplashModalProps {
    onClose: () => void;
    onImageInsert: (image: Photo) => void;
    unsplashProviderConfig: DefaultHeaderTypes | null;
}
declare const UnsplashSearchModal: React.FC<UnsplashModalProps>;
export default UnsplashSearchModal;
