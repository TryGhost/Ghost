/**
 * Unsubscribe feature chunk — newsletter unsubscribe from an email-footer link.
 *
 * Trigger (parsed by the shell from the top-level query string):
 *  - ?action=unsubscribe&uuid=&key=&newsletter=&comments=
 *
 * Works unauthenticated (keyed by uuid+key); no members dependency.
 */

import {UnsubscribeModal} from './UnsubscribeModal';
import unsubscribeCss from './unsubscribe.css?inline';
import {createApiClientFromSite} from '../../shared/api-client';
import {ensureSiteData} from '../../shared/api-client/site-data';
import type {FeatureMount} from '../../types';

export const mount: FeatureMount = async ({services, params}) => {
    const api = createApiClientFromSite(services.getState().site);

    await ensureSiteData(services, api);

    const handle = services.openModal(
        <UnsubscribeModal
            services={services}
            api={api}
            uuid={params?.uuid ?? ''}
            memberKey={params?.key ?? ''}
            newsletterUuid={params?.newsletter || undefined}
            comments={params?.comments === 'true' || params?.comments === '1'}
            onClose={() => handle.close()}
        />,
        {css: unsubscribeCss, panelClass: 'gh-unsubscribe-modal-panel'}
    );
};
