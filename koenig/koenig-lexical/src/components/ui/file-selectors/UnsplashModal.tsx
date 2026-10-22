import Portal from '../Portal';
import {UnsplashSearchModal} from '@tryghost/kg-unsplash-selector';

interface UnsplashModalProps {
    unsplashConf: unknown;
    onImageInsert: (image: unknown) => void;
    onClose: () => void;
}

const UnsplashModal = ({unsplashConf, onImageInsert, onClose}: UnsplashModalProps) => {
    return (
        <Portal>
            <UnsplashSearchModal
                unsplashProviderConfig={unsplashConf as Parameters<typeof UnsplashSearchModal>[0]['unsplashProviderConfig']}
                onClose={onClose}
                onImageInsert={onImageInsert}
            />
        </Portal>
    );
};

export default UnsplashModal;
