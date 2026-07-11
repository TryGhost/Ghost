import getHandle from './get-handle';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {useNavigate} from '@tryghost/admin-x-framework';

export const handleProfileClick = (actor: ActorProperties | string, navigate: ReturnType<typeof useNavigate>, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (typeof actor === 'string') {
        navigate(`/profile/${actor}`);
    } else {
        navigate(`/profile/${getHandle(actor)}`);
    }
};
