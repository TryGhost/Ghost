import APAvatar from '@src/components/global/APAvatar';
import NewPostModal from './NewPostModal';
import NiceModal from '@ebay/nice-modal-react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button} from '@tryghost/shade';

const FeedInput: React.FC<{user?: ActorProperties}> = ({user}) => {
    return (
        <>
            <div className='relative my-5 w-full'>
                <div className='pointer-events-none absolute left-4 top-4'>
                    <APAvatar author={user as ActorProperties} />
                </div>
                <Button aria-label='New post' className='text inset-0 h-[72px] w-full justify-start rounded-lg bg-white pl-[68px] text-left text-[1.5rem] font-normal tracking-normal text-gray-500 shadow-[0_5px_24px_0px_rgba(0,0,0,0.02),0px_2px_5px_0px_rgba(0,0,0,0.07),0px_0px_1px_0px_rgba(0,0,0,0.25)] transition-all hover:bg-white hover:shadow-[0_5px_24px_0px_rgba(0,0,0,0.05),0px_14px_12px_-9px_rgba(0,0,0,0.07),0px_0px_1px_0px_rgba(0,0,0,0.25)] dark:border dark:border-gray-925 dark:bg-black dark:shadow-none dark:hover:border-gray-800 dark:hover:bg-black dark:hover:shadow-none' onClick={() => NiceModal.show(NewPostModal)}>What&apos;s new?</Button>
            </div>
        </>
    );
};

export default FeedInput;