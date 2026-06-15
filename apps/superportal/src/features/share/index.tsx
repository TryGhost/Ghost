import {ShareModal} from './ShareModal';
import shareCss from './share.css?inline';
import type {FeatureMount} from '../../types';

export const mount: FeatureMount = ({services}) => {
    const handle = services.openModal(
        <ShareModal services={services} onClose={() => handle.close()} />,
        {css: shareCss, panelClass: 'gh-share-modal-panel'}
    );
};
