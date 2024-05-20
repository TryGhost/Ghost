// import {Avatar, Button, List, ListItem, Modal} from '@tryghost/admin-x-design-system';
import {Following} from './ListIndex.tsx';
// import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
// import {useFollow} from '@tryghost/admin-x-framework/api/activitypub';

interface FollowingListProps {
    following: Following[],
}

const FollowingList: React.FC<FollowingListProps> = ({following}) => {
    return (
        <div>
            <h2>Following List</h2>
            <ul>
                {following.map(({id, username}) => (
                    <li key={id}>
                        {username}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default FollowingList;