import '@tryghost/kg-unsplash-selector/dist/style.css';
import Portal from '../../utils/portal';
import React from 'react';
import {DefaultHeaderTypes, PhotoType, UnsplashSearchModal} from '@tryghost/kg-unsplash-selector';

type UnsplashSelectorModalProps = {
    onClose: () => void;
    onImageInsert: (image: PhotoType) => void;
    unsplashProviderConfig: DefaultHeaderTypes | null;
};

const UnsplashSelector : React.FC<UnsplashSelectorModalProps> = ({unsplashProviderConfig, onClose, onImageInsert}) => {
    return (
        <Portal classNames='admin-x-settings'>
            <UnsplashSearchModal
                unsplashProviderConfig={unsplashProviderConfig}
                onClose={onClose}
                onImageInsert={onImageInsert}
            />
        </Portal>
    );
};

export default UnsplashSelector;
