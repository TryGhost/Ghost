import NiceModal from '@ebay/nice-modal-react';
import ViewProfileModal from '../components/modals/ViewProfileModal';
import getUsername from './get-username';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {useNavigate} from '@tryghost/admin-x-framework';

export const handleProfileClick = (actorOrHandle: ActorProperties | string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    NiceModal.show(ViewProfileModal, {
        handle: typeof actorOrHandle === 'string' ? actorOrHandle : getUsername(actorOrHandle)
    });
};

export const handleProfileClickRR = (actor: ActorProperties | string, navigate: ReturnType<typeof useNavigate>, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (typeof actor === 'string') {
        navigate(`/profile/${actor}`);
    } else {
        navigate(`/profile/${actor.handle || getUsername(actor)}`);
    }
};