import {SearchModal} from './SearchModal';
import searchCss from './search.css?inline';
import type {FeatureMount} from '../../types';

export const mount: FeatureMount = ({services}) => {
    const handle = services.openModal(
        <SearchModal services={services} onClose={() => handle.close()} />,
        {
            css: searchCss,
            panelClass: 'gh-search-modal-panel',
            backdropClass: 'gh-search-modal-backdrop'
        }
    );
};
