import APAvatar from '@src/components/global/APAvatar';
import {Account} from '@src/api/activitypub';
import {Heading} from '@tryghost/admin-x-design-system';
import {Skeleton} from '@tryghost/shade';

type ProfileProps = {
    account?: Account
    isLoading: boolean
}

const Profile: React.FC<ProfileProps> = ({account, isLoading}) => {
    return (
        <div className='flex flex-col items-center'>
            <APAvatar
                author={
                    {
                        icon: {
                            url: account?.avatarUrl || ''
                        },
                        name: account?.name || '',
                        handle: account?.handle
                    }
                }
                size='lg'
            />
            <Heading className='mb-1 mt-4' level={3}>{!isLoading ? account?.name : <Skeleton className='w-32' />}</Heading>
            <span className='text-[1.5rem] text-gray-700'>{!isLoading ? account?.handle : <Skeleton className='w-full max-w-56' />}</span>
        </div>
    );
};

export default Profile;
