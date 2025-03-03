import getUsername from './get-username';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {useNavigate} from '@tryghost/admin-x-framework';

export const handleProfileClick = (actor: ActorProperties, navigate: ReturnType<typeof useNavigate>, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(`/profile/${getUsername(actor)}`);
};
