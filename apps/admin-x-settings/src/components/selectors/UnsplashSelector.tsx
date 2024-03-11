import '@tryghost/unsplash-selector/styles/index.css';
import Portal from '../../utils/portal';
import {DefaultHeaderTypes, PhotoType, UnsplashProvider, UnsplashSearchModal} from '@tryghost/unsplash-selector';
import {useMemo} from 'react';

interface UnsplashModalProps {
    onClose: () => void;
    onImageInsert: (image: PhotoType) => void;
    unsplashConf: {
      defaultHeaders: DefaultHeaderTypes;
    };

  }

export const UnsplashSelector : React.FC<UnsplashModalProps> = ({onClose, onImageInsert, unsplashConf}) => {
    const providerUnsplash = useMemo(() => {
        return new UnsplashProvider(unsplashConf.defaultHeaders);
    }, [unsplashConf]);
    return (
        <Portal classNames='admin-x-settings'>
            <UnsplashSearchModal
                unsplashProvider={providerUnsplash}
                onClose={onClose}
                onImageInsert={onImageInsert}
            />
        </Portal>
    );
};
