import Portal from '../../utils/portal';
import React from 'react';
import {type DefaultHeaderTypes, type InsertImagePayload, UnsplashSearchModal} from '@tryghost/kg-unsplash-selector';

type UnsplashSelectorModalProps = {
    onClose: () => void;
    onImageInsert: (image: InsertImagePayload) => void;
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
