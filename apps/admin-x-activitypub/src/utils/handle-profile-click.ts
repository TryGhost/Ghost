import NiceModal from '@ebay/nice-modal-react';
import ViewProfileModal from '../components/modals/ViewProfileModal';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';

export const handleProfileClick = (actorOrHandle: ActorProperties | string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    NiceModal.show(ViewProfileModal, {
        accountApId: typeof actorOrHandle === 'string' ? actorOrHandle : actorOrHandle.id || ''
    });
};
